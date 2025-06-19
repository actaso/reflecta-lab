'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

export interface TagOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tag: {
      setTag: () => ReturnType;
      toggleTag: () => ReturnType;
      unsetTag: () => ReturnType;
    };
  }
}

export const Tag = Mark.create<TagOptions>({
  name: 'tag',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
      'data-tag': '', 
      class: 'tag-highlight' 
    }), 0];
  },

  addCommands() {
    return {
      setTag: () => ({ commands }) => {
        return commands.setMark(this.name);
      },
      toggleTag: () => ({ commands }) => {
        return commands.toggleMark(this.name);
      },
      unsetTag: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});