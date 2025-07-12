'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coachingBlock: {
      insertCoachingBlock: (content: string) => ReturnType;
    };
  }
}

const CoachingBlockNodeView = ({ node }: ReactNodeViewProps) => {
  const content = node.attrs.content as string || 'No content provided';

  return (
    <NodeViewWrapper className="coaching-block-wrapper">
      <div className="flex items-start gap-3 py-3">
        {/* Your custom hand icon */}
        <div className="flex-shrink-0 mt-1">
          <img 
            src="/icon-sage.png" 
            alt="Coaching prompt" 
            width="20" 
            height="20" 
            className="opacity-60"
          />
        </div>
        
        {/* Content - matches editor text styling exactly */}
        <div 
          className="flex-1 text-black dark:text-[#ededed]" 
          style={{ 
            fontFamily: 'var(--font-geist-sans)', 
            fontSize: '16px', 
            lineHeight: '1.6' 
          }}
        >
          {content}
        </div>
        
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
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => {
          if (!attributes.content) {
            return {};
          }
          return {
            'data-content': attributes.content,
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
        'data-content': node.attrs.content 
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CoachingBlockNodeView);
  },

  addCommands() {
    return {
      insertCoachingBlock:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          });
        },
    };
  },
});