import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceRecordingState {
  state: 'idle' | 'recording' | 'paused' | 'processing' | 'reviewing';
  duration: number;
  audioBlob?: Blob;
  transcription?: string;
  error?: string;
}

export interface GlobalVoiceRecorderHook {
  voiceRecording: VoiceRecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  onTranscriptionComplete?: (text: string) => void;
  setTranscriptionCallback: (callback: (text: string) => void) => void;
}

const MAX_RECORDING_DURATION = 7 * 60; // 7 minutes in seconds

// Global state to share across components
let globalVoiceRecording: VoiceRecordingState = { state: 'idle', duration: 0 };
let globalTranscriptionCallback: ((text: string) => void) | null = null;
let subscribers: ((state: VoiceRecordingState) => void)[] = [];

const notifySubscribers = () => {
  subscribers.forEach(callback => callback(globalVoiceRecording));
};

export function useGlobalVoiceRecorder(): GlobalVoiceRecorderHook {
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecordingState>(globalVoiceRecording);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Subscribe to global state changes
  useEffect(() => {
    const subscriber = (newState: VoiceRecordingState) => {
      setVoiceRecording(newState);
    };
    subscribers.push(subscriber);
    
    return () => {
      subscribers = subscribers.filter(s => s !== subscriber);
    };
  }, []);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (globalVoiceRecording.state === 'recording') {
      interval = setInterval(() => {
        globalVoiceRecording = { 
          ...globalVoiceRecording, 
          duration: globalVoiceRecording.duration + 1 
        };
        notifySubscribers();
        
        // Auto-stop recording at max duration
        if (globalVoiceRecording.duration >= MAX_RECORDING_DURATION) {
          // We'll handle this in the component
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [globalVoiceRecording.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateGlobalState = (newState: Partial<VoiceRecordingState>) => {
    globalVoiceRecording = { ...globalVoiceRecording, ...newState };
    notifySubscribers();
  };

  const startRecording = async () => {
    try {
      // Reset any existing recording first
      resetRecording();
      
      updateGlobalState({ state: 'recording', duration: 0 });
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyserNode = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);

      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyserNode;
      setAudioContext(audioCtx);
      setAnalyser(analyserNode);

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
          updateGlobalState({ audioBlob });
          console.log('Recording stopped. Blob size:', audioBlob.size);
          
          // Auto-transcribe after stopping
          transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      console.log('Recording started...');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      updateGlobalState({ 
        state: 'idle', 
        error: "Unable to access microphone. Please check permissions." 
      });
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && globalVoiceRecording.state !== 'processing') {
      updateGlobalState({ state: 'processing' });
      mediaRecorderRef.current.stop();
      
      // Cleanup audio context and stream
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        setAudioContext(null);
      }
      if (analyserRef.current) {
        analyserRef.current = null;
        setAnalyser(null);
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
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && globalVoiceRecording.state === 'recording') {
      mediaRecorderRef.current.pause();
      updateGlobalState({ state: 'paused' });
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && globalVoiceRecording.state === 'paused') {
      mediaRecorderRef.current.resume();
      updateGlobalState({ state: 'recording' });
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('Starting transcription...');
      
      const formData = new FormData();
      formData.append('audio', audioBlob);

              const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        updateGlobalState({
          state: 'reviewing',
          transcription: result.text
        });
        
        // Call the transcription callback if set
        if (globalTranscriptionCallback) {
          globalTranscriptionCallback(result.text);
        }
        
        console.log('Transcription completed:', result.text);
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      updateGlobalState({
        state: 'idle',
        error: error instanceof Error ? error.message : 'Transcription failed'
      });
    }
  }, []);

  const resetRecording = useCallback(() => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    // Cleanup resources
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      setAudioContext(null);
    }
    if (analyserRef.current) {
      analyserRef.current = null;
      setAnalyser(null);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    updateGlobalState({
      state: 'idle',
      duration: 0,
      audioBlob: undefined,
      transcription: undefined,
      error: undefined
    });
  }, []);

  const setTranscriptionCallback = useCallback((callback: (text: string) => void) => {
    globalTranscriptionCallback = callback;
  }, []);

  return {
    voiceRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioContext,
    analyser,
    setTranscriptionCallback
  };
} 