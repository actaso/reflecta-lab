'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useRef } from 'react';
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
      AutoTagExtension,
    ],
    content,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none',
      },
      handleTextInput: (view, from, to, text) => {
        if (text === '/') {
          const { selection } = view.state;
          const coords = view.coordsAtPos(selection.from);
          setDropdownPosition({
            x: coords.left,
            y: coords.bottom + 8,
          });
          setShowAIDropdown(true);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape') {
          setShowAIDropdown(false);
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
