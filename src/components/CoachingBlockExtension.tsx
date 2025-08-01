'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coachingBlock: {
      insertCoachingBlock: (content: string, variant?: 'text' | 'buttons' | 'multi-select', options?: string[], thinking?: string) => ReturnType;
    };
  }
}

interface CoachingBlockData {
  content: string;
  variant: 'text' | 'buttons' | 'multi-select';
  options?: string[];
  thinking?: string;
}

const CoachingBlockNodeView = ({ node }: ReactNodeViewProps) => {
  const data = node.attrs.data as CoachingBlockData || { 
    content: 'No content provided', 
    variant: 'text' 
  };
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(false);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    // TODO: Here you could trigger additional actions like inserting text
    // or calling an API based on the selected option
  };

  const handleMultiOptionToggle = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) 
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const renderTextVariant = () => (
    <div 
      className="flex-1 text-black dark:text-[#ededed] prose prose-sm max-w-none" 
      style={{ 
        fontFamily: 'var(--font-geist-sans)', 
        fontSize: '16px', 
        lineHeight: '1.6' 
      }}
    >
      <ReactMarkdown
        components={{
          // Override default styles to match editor
          p: ({ children }) => (
            <p className="mb-2 last:mb-0" style={{ 
              fontFamily: 'var(--font-geist-sans)', 
              fontSize: '16px', 
              lineHeight: '1.6',
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="ml-4 mb-2 last:mb-0" style={{ 
              fontFamily: 'var(--font-geist-sans)', 
              fontSize: '16px', 
              lineHeight: '1.6',
              margin: 0,
              marginBottom: '0.5rem',
              paddingLeft: '1rem'
            }}>
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="mb-1" style={{ 
              fontFamily: 'var(--font-geist-sans)', 
              fontSize: '16px', 
              lineHeight: '1.6'
            }}>
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-medium">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
        }}
      >
        {data.content}
      </ReactMarkdown>
    </div>
  );

  const renderButtonVariant = () => (
    <div className="flex-1">
      {/* Question/prompt text */}
      <div 
        className="text-black dark:text-[#ededed] mb-4" 
        style={{ 
          fontFamily: 'var(--font-geist-sans)', 
          fontSize: '16px', 
          lineHeight: '1.6' 
        }}
      >
        {data.content}
      </div>
      
      {/* Button options - horizontal layout */}
      <div className="flex flex-wrap gap-2">
        {data.options?.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionSelect(option)}
            className={`
              group relative px-2 py-1 text-center rounded-md border transition-all duration-300 ease-out
              ${selectedOption === option 
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50'
              }
              transform hover:scale-[1.02] hover:shadow-sm
              animate-in slide-in-from-left-1 fade-in
              whitespace-nowrap
            `}
            style={{ 
              fontFamily: 'var(--font-geist-sans)', 
              fontSize: '14px',
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards'
            }}
          >
            {/* Option text - no padding needed without dot */}
            <span className="block text-sm">
              {option}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderMultiSelectVariant = () => (
    <div className="flex-1">
      {/* Question/prompt text */}
      <div 
        className="text-black dark:text-[#ededed] mb-4" 
        style={{ 
          fontFamily: 'var(--font-geist-sans)', 
          fontSize: '16px', 
          lineHeight: '1.6' 
        }}
      >
        {data.content}
      </div>
      
      {/* Multi-select options - vertical layout */}
      <div className="flex flex-col gap-2">
        {data.options?.map((option, index) => (
          <button
            key={index}
            onClick={() => handleMultiOptionToggle(option)}
            className={`
              group relative px-3 py-2 text-left rounded-md border transition-all duration-300 ease-out
              ${selectedOptions.includes(option)
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50'
              }
              transform hover:scale-[1.01] hover:shadow-sm
              animate-in slide-in-from-left-1 fade-in
            `}
            style={{ 
              fontFamily: 'var(--font-geist-sans)', 
              fontSize: '14px',
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards'
            }}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${selectedOptions.includes(option) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {selectedOptions.includes(option) && (
                  <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm">{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <NodeViewWrapper className="coaching-block-wrapper">
      <div className="flex items-start gap-3 py-3">
        {/* Sage icon with subtle animation */}
        <div className="flex-shrink-0 mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/icon-sage.png" 
            alt="Coaching prompt" 
            width="20" 
            height="20" 
            className={`
              opacity-60 transition-all duration-500 ease-out
              ${data.variant === 'buttons' ? 'animate-pulse' : ''}
            `}
          />
        </div>
        
        {/* Content based on variant */}
        {data.variant === 'text' ? renderTextVariant() : 
         data.variant === 'buttons' ? renderButtonVariant() : 
         renderMultiSelectVariant()}
        
        {/* Thinking toggle button */}
        {data.thinking && (
          <div className="flex-shrink-0 mt-1">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition-colors duration-200"
              title="Show AI thinking"
            >
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">?</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Thinking content */}
      {showThinking && data.thinking && (
        <div className="ml-8 mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Thinking</span>
          </div>
          <div 
            className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap"
            style={{ 
              fontFamily: 'var(--font-geist-mono)', 
              lineHeight: '1.5' 
            }}
          >
            {data.thinking}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const CoachingBlockExtension = Node.create({
  name: 'coachingBlock',
  
  group: 'block',
  
  content: '',
  
  atom: true,
  
  isolating: true,
  
  addAttributes() {
    return {
      data: {
        default: { content: '', variant: 'text' },
        parseHTML: element => {
          const dataAttr = element.getAttribute('data-coaching-block');
          return dataAttr ? JSON.parse(dataAttr) : { content: '', variant: 'text' };
        },
        renderHTML: attributes => {
          if (!attributes.data) {
            return {};
          }
          return {
            'data-coaching-block': JSON.stringify(attributes.data),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="coaching-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'coaching-block',
        'data-coaching-block': JSON.stringify(node.attrs.data)
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CoachingBlockNodeView);
  },

  addCommands() {
    return {
      insertCoachingBlock:
        (content: string, variant: 'text' | 'buttons' | 'multi-select' = 'text', options?: string[], thinking?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { 
              data: { 
                content, 
                variant, 
                options: (variant === 'buttons' || variant === 'multi-select') ? options : undefined,
                thinking
              } 
            },
          });
        },
    };
  },
});