'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useState } from 'react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coachingBlock: {
      insertCoachingBlock: (content: string, variant?: 'text' | 'buttons', options?: string[]) => ReturnType;
    };
  }
}

interface CoachingBlockData {
  content: string;
  variant: 'text' | 'buttons';
  options?: string[];
}

const CoachingBlockNodeView = ({ node }: ReactNodeViewProps) => {
  const data = node.attrs.data as CoachingBlockData || { 
    content: 'No content provided', 
    variant: 'text' 
  };
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    // TODO: Here you could trigger additional actions like inserting text
    // or calling an API based on the selected option
  };

  const renderTextVariant = () => (
    <div 
      className="flex-1 text-black dark:text-[#ededed]" 
      style={{ 
        fontFamily: 'var(--font-geist-sans)', 
        fontSize: '16px', 
        lineHeight: '1.6' 
      }}
    >
      {data.content}
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

  return (
    <NodeViewWrapper className="coaching-block-wrapper">
      <div className="flex items-start gap-3 py-3">
        {/* Sage icon with subtle animation */}
        <div className="flex-shrink-0 mt-1">
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
        {data.variant === 'text' ? renderTextVariant() : renderButtonVariant()}
      </div>
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
        (content: string, variant: 'text' | 'buttons' = 'text', options?: string[]) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { 
              data: { 
                content, 
                variant, 
                options: variant === 'buttons' ? options : undefined 
              } 
            },
          });
        },
    };
  },
});