'use client';

import { useState, useRef, useEffect } from 'react';
import CoachingHeader from './CoachingHeader';
import CoachingInput from './CoachingInput';
import CoachingMessage from './CoachingMessage';
import AudioVisualizer from './AudioVisualizer';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';
import confetti from 'canvas-confetti';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CoachingSessionData {
  objective: string;
  progress: number; // 0-100
  messages: CoachingMessage[];
}

export default function CoachingSession() {
  const [sessionData, setSessionData] = useState<CoachingSessionData>({
    objective: "Reflect on your biggest challenge this week",
    progress: 0,
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: "Before we dive in—take a breath.\n\nLet's start with a short breathing exercise to center ourselves:\n\n[meditation:title=\"5-Minute Centering\",duration=\"300\",description=\"A gentle breathing exercise to help you connect with what's present right now\",type=\"breathing\"]\n\nOnce you're ready, I'd love to hear: If you had to name what's most alive in you right now—what would it be?\n\nMaybe it's a tension you're holding, a quiet longing, or something you don't quite have words for yet. Whatever shows up—start there.",
        timestamp: new Date()
      }
    ]
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isEvaluatingProgress, setIsEvaluatingProgress] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.messages]);

  // Trigger confetti celebration when reaching 100% progress
  const triggerCompletionCelebration = () => {
    // Burst from the progress bar area (top center)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.1, x: 0.5 }, // Top center where progress bar is
      colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'], // Vibrant celebration colors
      gravity: 0.8,
      scalar: 1.2,
    });

    // Second burst with different timing for extra delight
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.1, x: 0.3 },
        colors: ['#22c55e', '#3b82f6', '#a855f7'],
        gravity: 0.8,
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.1, x: 0.7 },
        colors: ['#f59e0b', '#ef4444', '#a855f7'],
        gravity: 0.8,
      });
    }, 400);

    console.log('🎉 Confetti celebration triggered for coaching completion!');
  };

  // Watch for progress reaching 100% and trigger celebration
  useEffect(() => {
    if (sessionData.progress === 100 && !confettiTriggered) {
      console.log('🎯 Progress reached 100%! Triggering celebration...');
      setConfettiTriggered(true);
      // Small delay to let the progress bar animation complete
      setTimeout(triggerCompletionCelebration, 300);
    }
  }, [sessionData.progress, confettiTriggered]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);



  const startRecording = async () => {
    try {
      setRecordingError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsRecording(true);
      setRecordingTime(0);
      setInput(''); // Clear text input when starting recording
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setRecordingError("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }



    analyserRef.current = null;
    setIsRecording(false);
    
    // Here you would typically process the recorded audio
    // For now, we'll just simulate sending a message
    handleSendMessage("🎤 [Voice message - " + formatTime(recordingTime) + "]");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  const evaluateProgress = async () => {
    try {
      setIsEvaluatingProgress(true);
      console.log('🎯 Evaluating coaching progress...', 'Current progress:', sessionData.progress);
      
      const response = await fetch('/api/prototype/progress-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory: sessionData.messages,
          previousProgress: sessionData.progress,
          sessionId: sessionData.objective,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`📊 Progress updated: ${result.previousProgress}% → ${result.progress}% (${result.rationale})`);
        
        setSessionData(prev => ({
          ...prev,
          progress: result.progress
        }));
      } else {
        // Use fallback progress from the API response
        console.log('⚠️ Progress evaluation failed, using fallback:', result.rationale);
        
        setSessionData(prev => ({
          ...prev,
          progress: result.progress || Math.min(prev.progress + 5, 100)
        }));
      }
    } catch (error) {
      console.error('Error evaluating progress:', error);
      
             // Fallback to incremental progress on any error
       setSessionData(prev => ({
         ...prev,
         progress: Math.min(prev.progress + 5, 100)
       }));
     } finally {
       setIsEvaluatingProgress(false);
     }
   };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: CoachingMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setSessionData(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    setInput('');
    setIsLoading(true);

    try {
      // Call the new coaching API endpoint with full conversation history
      const response = await fetch('/api/prototype/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId: sessionData.objective, // Use objective as session identifier
          conversationHistory: sessionData.messages // Include all previous messages for context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Create AI message placeholder
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: CoachingMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setSessionData(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage]
      }));

      setIsLoading(false);

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finishTokenDetected = false;
      
      console.log('🚀 Starting streaming response for message:', content.trim());

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                // Debug: Log every content chunk
                console.log('📝 Content chunk received:', JSON.stringify(data.content));
                
                // Update the AI message content incrementally
                setSessionData(prev => ({
                  ...prev,
                  messages: prev.messages.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                }));

                // Note: We'll check for finish tokens after streaming completes
              } else if (data.type === 'done') {
                // Check for finish tokens in the complete message after streaming
                console.log('✅ Streaming complete. Checking full message for finish tokens...');
                
                // Get the current AI message content to check for finish tokens
                setSessionData(prev => {
                  const aiMessage = prev.messages.find(msg => msg.id === aiMessageId);
                  const fullContent = aiMessage?.content || '';
                  
                  console.log('🔍 Checking full message content for finish tokens');
                  console.log('📝 Full content length:', fullContent.length);
                  
                  const hasFinishStart = fullContent.includes('[finish-start]');
                  const hasFinishEnd = fullContent.includes('[finish-end]');
                  
                  console.log('🔍 Finish token check:', { hasFinishStart, hasFinishEnd });
                  
                  if (hasFinishStart || hasFinishEnd) {
                    console.log('🎯 Finish token detected in full message! Setting progress to 100%');
                    console.log('🎯 Token type:', hasFinishStart ? '[finish-start]' : '[finish-end]');
                    finishTokenDetected = true;
                    return {
                      ...prev,
                      progress: 100
                    };
                  }
                  
                  return prev;
                });
                
                // Wait a bit for state update, then evaluate progress if needed
                setTimeout(() => {
                  if (!finishTokenDetected) {
                    console.log('📊 Calling progress evaluation...');
                    evaluateProgress();
                  } else {
                    console.log('⏭️ Skipping progress evaluation (finish token detected)');
                  }
                }, 100);
                
              } else if (data.type === 'error') {
                console.error('Streaming error:', data.error);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calling coaching API:', error);
      
      // Show error message to user
      const errorMessage: CoachingMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };

      setSessionData(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
      
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col relative">
      <CoachingHeader 
        objective={sessionData.objective}
        progress={sessionData.progress}
      />

      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />

      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-36">
        <div className="max-w-2xl mx-auto">
          {sessionData.messages.map((message) => (
            <CoachingMessage
              key={message.id}
              message={message}
            />
          ))}
          
          {isLoading && (
            <div className="text-left mb-8">
              <div className="inline-block">
                <div className="flex items-center space-x-1 text-neutral-400">
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[720px] mx-auto bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-t-2xl shadow-lg">
        <div className="flex justify-center p-4">
          <div className="w-full max-w-[720px]">
            {isRecording ? (
              <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
              <div className="text-gray-600 font-mono text-lg font-medium min-w-[60px]">
                {formatTime(recordingTime)}
              </div>
              
              <AudioVisualizer 
                isRecording={isRecording}
                audioContext={audioContextRef.current}
                analyser={analyserRef.current}
                className="flex-1"
              />

              <Button
                onClick={stopRecording}
                variant="destructive"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
              >
                <MicOff className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-center gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(input);
                      }
                    }}
                    placeholder="What's on your mind?"
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm placeholder-neutral-400 focus:outline-none disabled:opacity-50 transition-all"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 h-10 w-10 rounded-full bg-neutral-700 hover:bg-neutral-800 disabled:opacity-30 transition-all"
                    size="icon"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </Button>
                </form>
              </div>
              <Button
                onClick={startRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          )}
          
            {recordingError && (
              <p className="text-sm text-red-600 mt-2">{recordingError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 