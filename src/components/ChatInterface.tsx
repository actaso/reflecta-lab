'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { AIMode } from './AIDropdown';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatInterfaceProps {
  mode: AIMode;
  context: string;
  autoFocus?: boolean;
}

export default function ChatInterface({ mode, context, autoFocus = false }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: {
      mode,
      context
    },
    onFinish: () => {
      scrollToBottom();
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize chat with a welcome message based on the mode
  useEffect(() => {
    if (!hasInitialized && mode && context) {
      const welcomeMessages = {
        'dive-deeper': "I'm here to help you explore your thoughts more deeply. What aspect of your journal entry resonates most with you?",
        'reflect-back': "Let me offer some reflections on what you've written. I'm curious about the patterns and insights I notice in your thoughts.",
        'scrutinize-thinking': "I'm here to help you examine your thinking more critically. Let's dig into the assumptions and reasoning behind your ideas."
      };

      // Add an initial AI message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeMessages[mode]
        }
      ]);
      
      setHasInitialized(true);
    }
  }, [mode, context, hasInitialized, setMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    setHasInitialized(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Clear chat button */}
      {messages.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={handleClearChat}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Clear conversation
          </button>
        </div>
      )}
      
      {/* Input */}
      <div className="border-t border-neutral-200 dark:border-neutral-700">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}