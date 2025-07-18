'use client';

import ReactMarkdown from 'react-markdown';

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
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-neutral-700">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-neutral-600">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-neutral-200 pl-4 italic text-neutral-500 my-3">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
} 