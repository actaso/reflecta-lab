'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef } from 'react';
import { AutoTagExtension } from './AutoTagExtension';
import AIDropdown from './AIDropdown';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function Editor({ content, onChange, placeholder = "Start writing...", autoFocus = false }: EditorProps) {
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
  const getCursorPosition = () => {
    if (!editor || !editorRef.current) return { x: 0, y: 0 };

    const { view } = editor;
    const { state } = view;
    const { selection } = state;
    const { from } = selection;

    // Get coordinates of cursor position
    const coords = view.coordsAtPos(from);
    const editorRect = editorRef.current.getBoundingClientRect();

    return {
      x: coords.left,
      y: coords.bottom + 8, // Add some spacing below cursor
    };
  };

  // Handle Shift key for AI dropdown
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !e.repeat) {
        if (showAIDropdown) {
          setShowAIDropdown(false);
        } else {
          const position = getCursorPosition();
          setDropdownPosition(position);
          setShowAIDropdown(true);
        }
      }
    };

    // Add event listeners to the editor's DOM element
    const editorElement = editorRef.current?.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('keydown', handleKeyDown);
      
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [editor, showAIDropdown]);

  // Handle AI suggestion selection
  const handleAISuggestionSelect = (suggestion: string) => {
    if (!editor) return;
    
    // For now, just insert the suggestion as text
    // In the future, this could trigger actual AI processing
    const currentContent = editor.getText();
    const newContent = currentContent + (currentContent ? '\n\n' : '') + `💡 ${suggestion}`;
    
    editor.commands.setContent(newContent);
    editor.commands.focus('end');
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
        onSelect={handleAISuggestionSelect}
      />
    </div>
  );
}