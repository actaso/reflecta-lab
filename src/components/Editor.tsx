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
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { AutoTagExtension } from './AutoTagExtension';
import { CoachingBlockExtension } from './CoachingBlockExtension';
import { ImageMetadata } from '@/types/journal';
import { imageService } from '@/services/imageService';
import { auth } from '@/lib/firebase';
import { CoachingInteractionRequest } from '@/types/coaching';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  entryId?: string;
  onImageUploaded?: (imageMetadata: ImageMetadata) => void;
  onCreateNewEntry?: () => void;
}

export interface EditorHandle {
  insertCoachingBlock: (content: string, variant?: 'text' | 'buttons', options?: string[]) => void;
  getEditor: () => ReturnType<typeof useEditor>;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ content, onChange, placeholder = "Start writing...", autoFocus = false, entryId, onImageUploaded, onCreateNewEntry }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);

  // Legacy function - commented out to avoid linting errors
  // const generateCoachingBlock = useCallback(async (currentContent: string, currentEntryId?: string) => {
  //   // Implementation moved to generateStreamingCoachingBlock
  // }, []);

  // Generate streaming coaching block with real-time TipTap updates
  const generateStreamingCoachingBlock = useCallback(async (currentContent: string, view: EditorView, currentEntryId?: string) => {
    if (!currentEntryId) {
      console.warn('No entry ID provided for coaching block generation');
      return;
    }

    setIsLoadingCoaching(true);
    
    try {
      const request: CoachingInteractionRequest = {
        entryId: currentEntryId,
        entryContent: currentContent.replace(/<[^>]*>/g, '') // Strip HTML tags
      };

      const response = await fetch('/api/coaching-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      // Streaming state
      let variant = 'text';
      let options: string[] = [];
      let streamedContent = '';
      let isComplete = false;
      
      /**
       * Finds and updates the coaching block in the editor
       */
      const updateCoachingBlock = (newContent: string, newVariant: string, newOptions?: string[]) => {
        const currentState = view.state;
        const currentDoc = currentState.doc;
        
        // Find the coaching block node we need to update
        let coachingBlockPos = -1;
        currentDoc.descendants((node, pos) => {
          if (node.type.name === 'coachingBlock' && 
              (node.attrs.data.content === "Generating coaching prompt..." || 
               node.attrs.data.streaming === true)) {
            coachingBlockPos = pos;
            return false; // Stop iteration
          }
        });
        
        if (coachingBlockPos !== -1) {
          const newCoachingBlock = currentState.schema.nodes.coachingBlock.create({ 
            data: { 
              content: newContent, 
              variant: newVariant,
              options: newOptions,
              streaming: !isComplete // Mark as streaming until complete
            }
          });
          
          const newTr = currentState.tr.replaceWith(
            coachingBlockPos, 
            coachingBlockPos + 1, 
            newCoachingBlock
          );
          
          view.dispatch(newTr);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              switch (data.type) {
                case 'metadata':
                  // Update UI structure immediately
                  variant = data.variant;
                  options = data.options || [];
                  console.log('🎯 Metadata received:', { variant, options });
                  
                  // Update block with proper variant structure
                  updateCoachingBlock(streamedContent || "Generating coaching prompt...", variant, options);
                  break;
                  
                case 'content':
                  // Stream content in real-time
                  streamedContent += data.text;
                  console.log('📝 Content chunk:', data.text);
                  
                  // Update block with streaming content
                  updateCoachingBlock(streamedContent, variant, options);
                  break;
                  
                case 'done':
                  // Stream complete
                  isComplete = true;
                  console.log('✅ Stream complete');
                  
                  // Final update to mark as complete
                  updateCoachingBlock(streamedContent, variant, options);
                  break;
                  
                case 'fallback':
                  // Use full response as fallback
                  console.log('🔄 Fallback response:', data.fullResponse);
                  streamedContent = data.fullResponse;
                  isComplete = true;
                  
                  updateCoachingBlock(streamedContent, variant, options);
                  break;
                  
                case 'error':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }

        if (isComplete) break;
      }
      
    } catch (error) {
      console.error('Error generating coaching block:', error);
      
      // Handle different error types with appropriate messages
      let errorMessage = "Unable to generate coaching prompt. Please try again.";
      
      if (error instanceof Error && error.message.includes('401')) {
        errorMessage = "Please sign in to get personalized coaching prompts tailored to your journey.";
      }
      
      // Update block with error message
      const currentState = view.state;
      const currentDoc = currentState.doc;
      
      let coachingBlockPos = -1;
      currentDoc.descendants((node, pos) => {
        if (node.type.name === 'coachingBlock' && 
            (node.attrs.data.content === "Generating coaching prompt..." || 
             node.attrs.data.streaming === true)) {
          coachingBlockPos = pos;
          return false;
        }
      });
      
      if (coachingBlockPos !== -1) {
        const errorBlock = currentState.schema.nodes.coachingBlock.create({ 
          data: { 
            content: errorMessage, 
            variant: 'text' 
          }
        });
        
        const newTr = currentState.tr.replaceWith(
          coachingBlockPos, 
          coachingBlockPos + 1, 
          errorBlock
        );
        
        view.dispatch(newTr);
      }
    } finally {
      setIsLoadingCoaching(false);
    }
  }, []);

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
      CoachingBlockExtension,
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
      handleKeyDown: (view, event) => {
        // Handle CMD+Enter at TipTap level to prevent linebreak
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          if (onCreateNewEntry) {
            onCreateNewEntry();
          }
          return true; // Prevent further processing
        }

        // Handle space at beginning of line for AI coaching trigger
        if (event.key === ' ') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // Check if we're at the beginning of a paragraph
          if ($from.parent.type.name === 'paragraph' && $from.parentOffset === 0) {
            event.preventDefault();
            
            // Insert loading coaching block first
            const loadingBlock = state.schema.nodes.coachingBlock.create({ 
              data: { 
                content: "Generating coaching prompt...", 
                variant: 'text' 
              }
            });
            const emptyParagraph = state.schema.nodes.paragraph.create();
            
            const tr = state.tr.replaceSelectionWith(loadingBlock);
            const insertPos = tr.selection.to;
            tr.insert(insertPos, emptyParagraph);
            
            // Set selection at the start of the new paragraph
            const newPos = insertPos + 1;
            tr.setSelection(TextSelection.create(tr.doc, newPos));
            
            view.dispatch(tr);
            
            // Generate streaming coaching block from API
            generateStreamingCoachingBlock(content, view, entryId).catch(error => {
              console.error('Error in coaching block generation:', error);
              // Replace with fallback error message
              const currentState = view.state;
              const currentDoc = currentState.doc;
              
              let coachingBlockPos = -1;
              currentDoc.descendants((node, pos) => {
                if (node.type.name === 'coachingBlock' && node.attrs.data.content === "Generating coaching prompt...") {
                  coachingBlockPos = pos;
                  return false;
                }
              });
              
              if (coachingBlockPos !== -1) {
                const errorBlock = currentState.schema.nodes.coachingBlock.create({ 
                  data: { 
                    content: "Unable to generate coaching prompt. Please try again.", 
                    variant: 'text' 
                  }
                });
                
                const newTr = currentState.tr.replaceWith(
                  coachingBlockPos, 
                  coachingBlockPos + 1, 
                  errorBlock
                );
                
                view.dispatch(newTr);
              }
            });
            
            return true;
          }
        }
        
        return false; // Allow other keys to be handled normally
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Schedule setContent outside of render cycle to avoid flushSync error
      setTimeout(() => {
        if (editor && content !== editor.getHTML()) {
          editor.commands.setContent(content);
        }
      }, 0);
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
            setTimeout(() => {
              editor.commands.setContent(currentContent);
            }, 0);
            editor.chain().focus().setImage({ src: url }).run();
              
            console.log('🖼️ [PASTE] Image inserted successfully, URL removed');
          } catch (error) {
            console.error('🖼️ [PASTE] URL upload failed:', error);
            
            // Replace placeholder with the original URL text on failure
            const currentContent = editor.getHTML();
            const contentWithUrl = currentContent.replace(placeholderText, text);
            setTimeout(() => {
              editor.commands.setContent(contentWithUrl);
            }, 0);
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

  // Handle clicks in empty space below content to add new paragraph
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    if (!editor) return;

    const editorElement = editorRef.current;
    if (!editorElement) return;

    // Get the ProseMirror editor view element
    const proseMirrorElement = editorElement.querySelector('.ProseMirror');
    if (!proseMirrorElement) return;

    // Check if click was below the ProseMirror content
    const proseMirrorRect = proseMirrorElement.getBoundingClientRect();
    const clickY = event.clientY;
    
    if (clickY > proseMirrorRect.bottom) {
      // Get the last node in the document
      const { doc } = editor.state;
      const lastNode = doc.lastChild;
      
      // Always ensure there's an empty paragraph at the end for continued writing
      if (!lastNode || lastNode.type.name !== 'paragraph' || lastNode.textContent.trim() !== '') {
        editor.chain()
          .focus('end')
          .insertContent('<p></p>')
          .focus('end')
          .run();
      } else {
        // If last node is already an empty paragraph, just focus it
        editor.commands.focus('end');
      }
    }
  }, [editor]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    insertCoachingBlock: (content: string, variant: 'text' | 'buttons' = 'text', options?: string[]) => {
      if (editor) {
        editor.chain()
          .focus()
          .insertCoachingBlock(content, variant, options)
          .insertContent('<p></p>')
          .focus('end')
          .run();
      }
    },
    getEditor: () => editor,
  }), [editor]);

  return (
    <div 
      className="w-full h-full relative" 
      ref={editorRef}
      onClick={handleEditorClick}
      style={{ minHeight: '100%' }}
    >
      <EditorContent 
        editor={editor} 
        className="w-full min-h-full"
      />
      {/* Add invisible clickable area to capture clicks below content */}
      <div 
        className="w-full flex-1 min-h-[200px]" 
        onClick={handleEditorClick}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
