'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AutoTagExtension } from './AutoTagExtension';
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
      StarterKit.configure({
        // Disable default styling and keep it minimal
        heading: {
          levels: [1, 2, 3],
        },
        // Disable bulletList to prevent conflict with TaskList, but keep listItem
        bulletList: false,
      }),
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
