'use client';

import { Message } from 'ai';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}>
            {isUser ? 'U' : 'AI'}
          </div>
        </div>
        
        {/* Message bubble */}
        <div className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 mr-auto'
        }`}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
}