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
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useCallback } from 'react';
import { AutoTagExtension } from './AutoTagExtension';
import { ImageMetadata } from '@/types/journal';
import { imageService } from '@/services/imageService';
import { auth } from '@/lib/firebase';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  entryId?: string;
  onImageUploaded?: (imageMetadata: ImageMetadata) => void;
}

export default function Editor({ content, onChange, placeholder = "Start writing...", autoFocus = false, onImageUploaded }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    console.log('🖼️ [EDITOR] Starting image upload:', file.name, file.type, file.size);
    console.log('🖼️ [EDITOR] Firebase Auth current user:', auth.currentUser);
    console.log('🖼️ [EDITOR] User ID:', auth.currentUser?.uid);
    console.log('🖼️ [EDITOR] User email:', auth.currentUser?.email);
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.error('🖼️ [EDITOR] User not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      const result = await imageService.uploadImage(file, uid);
      console.log('🖼️ [EDITOR] Upload successful:', result);
      
      // Call callback if provided
      if (onImageUploaded) {
        onImageUploaded({
          filename: result.filename,
          url: result.url,
          size: result.size,
          type: result.type,
          uploadedAt: new Date()
        });
      }
      
      return result.url;
    } catch (error) {
      console.error('🖼️ [EDITOR] Upload failed:', error);
      throw error;
    }
  }, [onImageUploaded]);

  // Handle URL-based image upload
  const handleImageFromUrl = useCallback(async (url: string): Promise<string> => {
    console.log('🖼️ [EDITOR] Processing image URL:', url);
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.error('🖼️ [EDITOR] User not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      // Check if it's a direct image URL
      if (imageService.isImageUrl(url)) {
        const result = await imageService.uploadImageFromUrl(url, uid);
        console.log('🖼️ [EDITOR] URL upload successful:', result);
        
        if (onImageUploaded) {
          onImageUploaded({
            filename: result.filename,
            url: result.url,
            size: result.size,
            type: result.type,
            uploadedAt: new Date()
          });
        }
        
        return result.url;
      } else {
        throw new Error('Not a valid image URL');
      }
    } catch (error) {
      console.error('🖼️ [EDITOR] URL upload failed:', error);
      throw error;
    }
  }, [onImageUploaded]);

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
      BulletList,
      ListItem,
      AutoTagExtension,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
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

  // Add custom paste and drop handlers
  useEffect(() => {
    if (!editor) return;

    const handlePaste = async (event: ClipboardEvent) => {
      console.log('🖼️ [PASTE] Paste event detected');
      const items = Array.from(event.clipboardData?.items || []);
      console.log('🖼️ [PASTE] Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));
      
      const imageItems = items.filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length > 0) {
        console.log('🖼️ [PASTE] Found image items:', imageItems.length);
        event.preventDefault();
        
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            console.log('🖼️ [PASTE] Processing image file:', file.name, file.type, file.size);
            try {
              const url = await handleImageUpload(file);
              editor.chain().focus().setImage({ src: url }).run();
            } catch (error) {
              console.error('🖼️ [PASTE] Upload failed:', error);
            }
          }
        }
        return;
      }
      
      // Check for pasted text that might be an image URL
      const text = event.clipboardData?.getData('text/plain');
      console.log('🖼️ [PASTE] Pasted text:', text);
      
      if (text) {
        const isImageUrl = imageService.isImageUrl(text);
        console.log('🖼️ [PASTE] Is image URL:', isImageUrl);
        
        if (isImageUrl) {
          console.log('🖼️ [PASTE] Processing direct image URL');
          event.preventDefault();
          
          // Insert a temporary placeholder while processing
          const placeholderText = '🔄 Processing image...';
          
          editor.chain()
            .focus()
            .insertContent(placeholderText)
            .run();
          
          console.log('🖼️ [PASTE] Placeholder inserted, starting upload');
          
          try {
            const url = await handleImageFromUrl(text);
            console.log('🖼️ [PASTE] URL processed successfully, replacing placeholder with image');
            
            // Get current content and remove both placeholder and original URL
            let currentContent = editor.getHTML();
            console.log('🖼️ [PASTE] Current content before cleanup:', currentContent);
            
            // Remove the placeholder
            currentContent = currentContent.replace(placeholderText, '');
            
            // Remove the original URL text if it exists in the content
            // Check for both plain text and as a link
            const urlEscaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
            currentContent = currentContent.replace(new RegExp(urlEscaped, 'g'), '');
            
            // Also remove any anchor tags containing this URL
            const linkRegex = new RegExp(`<a[^>]*href=["']${urlEscaped}["'][^>]*>.*?</a>`, 'gi');
            currentContent = currentContent.replace(linkRegex, '');
            
            console.log('🖼️ [PASTE] Content after URL removal:', currentContent);
            
            // Set the clean content, then add the image
            editor.commands.setContent(currentContent);
            editor.chain().focus().setImage({ src: url }).run();
              
            console.log('🖼️ [PASTE] Image inserted successfully, URL removed');
          } catch (error) {
            console.error('🖼️ [PASTE] URL upload failed:', error);
            
            // Replace placeholder with the original URL text on failure
            const currentContent = editor.getHTML();
            const contentWithUrl = currentContent.replace(placeholderText, text);
            editor.commands.setContent(contentWithUrl);
          }
        } else {
          console.log('🖼️ [PASTE] Not recognized as image URL, allowing default paste');
        }
      }
    };

    const handleDrop = async (event: DragEvent) => {
      console.log('🖼️ [DROP] Drop event detected');
      const files = Array.from(event.dataTransfer?.files || []);
      console.log('🖼️ [DROP] Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      console.log('🖼️ [DROP] Image files:', imageFiles.length);
      
      if (imageFiles.length > 0) {
        console.log('🖼️ [DROP] Processing dropped images');
        event.preventDefault();
        event.stopPropagation();
        
        for (const file of imageFiles) {
          console.log('🖼️ [DROP] Processing file:', file.name);
          try {
            const url = await handleImageUpload(file);
            editor.chain().focus().setImage({ src: url }).run();
          } catch (error) {
            console.error('🖼️ [DROP] Upload failed:', error);
          }
        }
      }
    };

    const handleDragOver = (event: DragEvent) => {
      console.log('🖼️ [DRAG] Dragover event, types:', event.dataTransfer?.types);
      if (event.dataTransfer?.types.includes('Files')) {
        console.log('🖼️ [DRAG] Files detected in dragover');
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste);
      editorElement.addEventListener('drop', handleDrop);
      editorElement.addEventListener('dragover', handleDragOver);
      
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
        editorElement.removeEventListener('drop', handleDrop);
        editorElement.removeEventListener('dragover', handleDragOver);
      };
    }
  }, [editor, handleImageUpload, handleImageFromUrl]);


  return (
    <div className="w-full h-full relative" ref={editorRef}>
      <EditorContent 
        editor={editor} 
        className="w-full h-full"
      />
    </div>
  );
}
