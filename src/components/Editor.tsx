'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Code from '@tiptap/extension-code';
import Blockquote from '@tiptap/extension-blockquote';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AutoTagExtension } from './AutoTagExtension';
import { YouTubeLinkExtension } from './YouTubeLinkExtension';
import AIDropdown, { AIMode } from './AIDropdown';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onAIModeSelect?: (mode: AIMode) => void;
}

export default function Editor({ content, onChange, placeholder = "Start writing...", autoFocus = false, onAIModeSelect }: EditorProps) {
  const [showAIDropdown, setShowAIDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Bold,
      Italic,
      Code,
      Blockquote,
      HardBreak,
      History,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      AutoTagExtension,
      YouTubeLinkExtension,
    ],
    content,
    autofocus: autoFocus,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        // Handle Shift+Cmd for AI dropdown
        if (event.shiftKey && event.metaKey && !event.repeat) {
          event.preventDefault();
          
          if (showAIDropdown) {
            setShowAIDropdown(false);
          } else {
            const position = getCursorPosition();
            setDropdownPosition(position);
            setShowAIDropdown(true);
          }
          return true;
        }
        return false;
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Auto-focus when autoFocus prop changes
  useEffect(() => {
    if (editor && autoFocus) {
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    }
  }, [editor, autoFocus]);

  // Get cursor position for dropdown placement
  const getCursorPosition = useCallback(() => {
    if (!editor || !editorRef.current) return { x: 0, y: 0 };

    const { view } = editor;
    const { state } = view;
    const { selection } = state;
    const { from } = selection;

    // Get coordinates of cursor position
    const coords = view.coordsAtPos(from);

    return {
      x: coords.left,
      y: coords.bottom + 8, // Add some spacing below cursor
    };
  }, [editor]);


  // Handle AI mode selection
  const handleAIModeSelect = (mode: AIMode) => {
    if (onAIModeSelect) {
      onAIModeSelect(mode);
    }
    setShowAIDropdown(false);
  };

  return (
    <div className="w-full relative" ref={editorRef}>
      <EditorContent 
        editor={editor} 
        className="w-full"
      />
      <AIDropdown
        isVisible={showAIDropdown}
        position={dropdownPosition}
        onClose={() => setShowAIDropdown(false)}
        onSelect={handleAIModeSelect}
      />
    </div>
  );
}
