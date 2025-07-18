'use client';

import { useState, useRef, useEffect } from 'react';
import CoachingHeader from './CoachingHeader';
import CoachingInput from './CoachingInput';
import CoachingMessage from './CoachingMessage';

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
    progress: 25,
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: "I'm here to listen and explore with you. What's been on your mind?",
        timestamp: new Date()
      }
    ]
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: CoachingMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    // Add user message
    setSessionData(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: CoachingMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I hear you. Can you tell me more about that?",
        timestamp: new Date()
      };

      setSessionData(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        progress: Math.min(prev.progress + 5, 100) // Increment progress
      }));

      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="h-screen bg-white flex flex-col relative">
      {/* Fixed Header */}
      <CoachingHeader 
        objective={sessionData.objective}
        progress={sessionData.progress}
      />

      {/* Gradient Overlay */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />

      {/* Main Chat Area */}
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

      {/* Fixed Bottom Input */}
      <CoachingInput
        input={input}
        onInputChange={setInput}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
} 