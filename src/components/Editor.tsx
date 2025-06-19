'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { AutoTagExtension } from './AutoTagExtension';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function Editor({ content, onChange, placeholder = "Start writing...", autoFocus = false }: EditorProps) {
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
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-full',
        style: 'min-height: 100%; padding-bottom: 50vh;',
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

  return (
    <div className="w-full min-h-full">
      <EditorContent 
        editor={editor} 
        className="w-full min-h-full"
      />
    </div>
  );
}