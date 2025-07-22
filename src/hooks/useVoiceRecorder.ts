import { useState, useRef, useEffect, useCallback } from 'react';

export type VoiceRecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'reviewing';

export interface VoiceRecording {
  state: VoiceRecordingState;
  duration: number;
  audioBlob?: Blob;
  transcription?: string;
  error?: string;
}

interface VoiceRecorderHook {
  voiceRecording: VoiceRecording;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

const MAX_RECORDING_DURATION = 7 * 60; // 7 minutes in seconds

export function useVoiceRecorder(): VoiceRecorderHook {
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording>({
    state: 'idle',
    duration: 0
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (voiceRecording.state === 'recording') {
      interval = setInterval(() => {
        setVoiceRecording(prev => {
          const newDuration = prev.duration + 1;
          // Auto-stop recording when reaching the limit
          if (newDuration >= MAX_RECORDING_DURATION) {
            stopRecording();
            return prev;
          }
          return { ...prev, duration: newDuration };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceRecording.state, stopRecording]);

  const startRecording = async () => {
    try {
      // Reset any existing recording first
      resetRecording();
      
      setVoiceRecording({ state: 'recording', duration: 0 });
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setVoiceRecording(prev => ({ ...prev, audioBlob }));
          console.log('Recording stopped. Blob size:', audioBlob.size);
        }
      };

      mediaRecorder.start();
      console.log('Recording started...');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setVoiceRecording(prev => ({ ...prev, error: "Unable to access microphone. Please check permissions." }));
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && voiceRecording.state !== 'processing') {
      setVoiceRecording(prev => ({ ...prev, state: 'processing' }));
      mediaRecorderRef.current.stop();
      
      // Cleanup audio context and stream
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Audio track stopped:', track.label);
        });
        streamRef.current = null;
      }
      
      console.log('Recording stopped and resources cleaned up.');
    }
  }, [voiceRecording.state]);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('Starting transcription...');
      
      // Create FormData with the audio blob
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Call our transcription API
      const response = await fetch('/api/prototype/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setVoiceRecording(prev => ({
          ...prev,
          state: 'reviewing',
          transcription: result.text
        }));
        
        console.log('Transcription completed:', result.text);
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      
      // Fallback to voice message format
      const fallbackMessage = `🎤 Voice message (${formatTime(voiceRecording.duration)})`;
      setVoiceRecording(prev => ({
        ...prev,
        state: 'reviewing',
        transcription: fallbackMessage,
        error: 'Transcription failed, but you can still send your voice message'
      }));
    }
  }, [voiceRecording.duration]);

  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.pause();
      setVoiceRecording(prev => ({ ...prev, state: 'paused' }));
      console.log('Recording paused.');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.resume();
      setVoiceRecording(prev => ({ ...prev, state: 'recording' }));
      console.log('Recording resumed.');
    }
  };

  const resetRecording = () => {
    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop and cleanup audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Audio track stopped:', track.label);
      });
      streamRef.current = null;
    }

    // Close audio context and disconnect nodes
    if (audioContextRef.current) {
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset state and buffers
    setVoiceRecording({ state: 'idle', duration: 0 });
    audioChunksRef.current = [];
    
    console.log('Recording reset and all resources cleaned up.');
  };

  // Handle transcription when recording is stopped
  useEffect(() => {
    if (voiceRecording.state === 'processing' && voiceRecording.audioBlob) {
      transcribeAudio(voiceRecording.audioBlob);
    }
  }, [voiceRecording.state, voiceRecording.audioBlob, transcribeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return {
    voiceRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
  };
}

// Helper function
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 