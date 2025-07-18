'use client';

import { useState, useRef, useEffect } from 'react';
import CoachingHeader from './CoachingHeader';
import CoachingInput from './CoachingInput';
import CoachingMessage from './CoachingMessage';
import MeditationIntro from './MeditationIntro';
import MeditationSession from './MeditationSession';
import MeditationTransition from './MeditationTransition';
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
  const [meditationPhase, setMeditationPhase] = useState<'intro' | 'active' | 'transitioning' | 'complete'>('intro');
  const [sessionData, setSessionData] = useState<CoachingSessionData>({
    objective: "Life Deep Dive Session",
    progress: 0,
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: "Once you're ready, I'd love to hear: If you had to name what's most alive in you right now—what would it be?\n\nMaybe it's a tension you're holding, a quiet longing, or something you don't quite have words for yet. Whatever shows up—start there.",
        timestamp: new Date()
      }
    ]
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.messages]);

  // Trigger confetti celebration when reaching 100% progress
  useEffect(() => {
    if (sessionData.progress === 100 && !confettiTriggered) {
      console.log('🎯 Progress reached 100%! Triggering celebration...');
      setConfettiTriggered(true);
      // Small delay to let the progress bar animation complete
      setTimeout(triggerCompletionCelebration, 300);
    }
  }, [sessionData.progress, confettiTriggered]);

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

  const evaluateProgress = async () => {
    try {
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

  const handleMeditationComplete = () => {
    setMeditationPhase('transitioning');
    // Give a moment for the transition, then show the coaching interface
    setTimeout(() => {
      setMeditationPhase('complete');
    }, 1000);
  };

  const startMeditation = () => {
    setMeditationPhase('active');
  };

  // Render meditation introduction screen
  if (meditationPhase === 'intro') {
    return <MeditationIntro onStartMeditation={startMeditation} />;
  }

  // Render full-screen meditation experience
  if (meditationPhase === 'active') {
    return <MeditationSession onComplete={handleMeditationComplete} />;
  }

  // Transition phase
  if (meditationPhase === 'transitioning') {
    return <MeditationTransition />;
  }

  // Full coaching interface (meditationPhase === 'complete')
  return (
    <div className="h-screen bg-white flex flex-col relative">
      <CoachingHeader 
        objective={sessionData.objective}
        progress={sessionData.progress}
        estimatedTime="25m"
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

      <CoachingInput
        input={input}
        onInputChange={setInput}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
} 