'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CoachingHeader from './CoachingHeader';
import CoachingInput from './CoachingInput';
import CoachingMessage from './CoachingMessage';
import confetti from 'canvas-confetti';
import { CoachingSession as CoachingSessionType, CoachingSessionMessage } from '@/types/coachingSession';

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
  sessionId?: string; // Track the current session ID
}

export default function CoachingSession() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [sessionData, setSessionData] = useState<CoachingSessionData>({
    objective: "Life Deep Dive Session",
    progress: 0,
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: "Welcome to your Life Deep Dive session. Before we begin exploring what's most alive in you right now, I'd like to offer you a moment to center yourself.\n\n[meditation:title=\"5-Minute Centering\",duration=\"300\",description=\"A gentle breathing exercise to help you connect with what's present right now\",type=\"breathing\"]\n\nOnce you're ready, I'd love to hear: If you had to name what's most alive in you right now—what would it be?\n\nMaybe it's a tension you're holding, a quiet longing, or something you don't quite have words for yet. Whatever shows up—start there.",
        timestamp: new Date()
      }
    ]
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.messages]);

  // Load existing session if sessionId is provided in URL
  useEffect(() => {
    const urlSessionId = searchParams.get('sessionId');
    
    if (urlSessionId && urlSessionId !== sessionData.sessionId) {
      loadExistingSession(urlSessionId);
    }
  }, [searchParams]);

  // Load existing session from Firestore
  const loadExistingSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    
    try {
      const response = await fetch(`/api/coaching-session?sessionId=${encodeURIComponent(sessionId)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Session not found, starting new session');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.session) {
        const loadedSession: CoachingSessionType = result.session;
        
        // Convert session data to component format
        setSessionData({
          objective: `${loadedSession.sessionType === 'initial-life-deep-dive' ? 'Life Deep Dive' : 'Coaching'} Session`,
          progress: Math.min((loadedSession.messages.length * 10), 100), // Estimate progress from message count
          messages: loadedSession.messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          })),
          sessionId: loadedSession.id
        });
        
        console.log(`✅ Loaded existing session: ${sessionId} with ${loadedSession.messages.length} messages`);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Generate session ID for new sessions
  const generateSessionId = (): string => {
    return crypto.randomUUID();
  };

  // Update URL with session ID
  const updateUrlWithSessionId = (sessionId: string) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('sessionId', sessionId);
    router.replace(currentUrl.pathname + currentUrl.search);
  };

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
          sessionId: sessionData.sessionId || sessionData.objective,
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

    // Generate session ID for first user message if not already set
    let currentSessionId = sessionData.sessionId;
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      setSessionData(prev => ({ ...prev, sessionId: currentSessionId }));
      updateUrlWithSessionId(currentSessionId);
      console.log(`🆔 Generated new session ID: ${currentSessionId}`);
    }

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
      // Call the coaching API endpoint with session ID and full conversation history
      const response = await fetch('/api/prototype/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId: currentSessionId, // Use actual session ID for persistence
          sessionType: 'initial-life-deep-dive', // Set session type
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

  // Show loading state while loading existing session
  if (isLoadingSession) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your coaching session...</p>
        </div>
      </div>
    );
  }

  // Show the coaching interface
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