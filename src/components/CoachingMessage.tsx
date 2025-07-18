'use client';

interface CoachingMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CoachingMessageProps {
  message: CoachingMessageData;
}

export default function CoachingMessage({ message }: CoachingMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`mb-8 ${isUser ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className={`
            px-0 py-2 text-base leading-relaxed
            ${isUser 
              ? 'text-neutral-700 font-medium' 
              : 'text-neutral-600'
            }
          `}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
} 