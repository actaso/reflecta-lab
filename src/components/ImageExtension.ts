import { Node as TiptapNode, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ImageService } from '@/services/imageService';
import { auth } from '@/lib/firebase';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
  onUpload?: (file: File) => Promise<string>;
  onError?: (error: Error) => void;
  onImageUploaded?: (imageMetadata: { filename: string; url: string; size: number; type: string; uploadedAt: Date }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const ImageExtension = TiptapNode.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      onUpload: undefined,
      onError: undefined,
      onImageUploaded: undefined,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      loading: {
        default: false,
      },
      error: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const imageService = new ImageService();
    
    return [
      new Plugin({
        key: new PluginKey('imageUpload'),
        props: {
          handlePaste: (view, event) => {
            console.log('🖼️ [IMAGE PASTE] Paste event detected');
            const items = Array.from(event.clipboardData?.items || []);
            console.log('🖼️ [IMAGE PASTE] Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));
            
            const imageItems = items.filter(item => item.type.startsWith('image/'));
            
            if (imageItems.length > 0) {
              console.log('🖼️ [IMAGE PASTE] Found image items:', imageItems.length);
              event.preventDefault();
              
              imageItems.forEach(item => {
                const file = item.getAsFile();
                if (file) {
                  console.log('🖼️ [IMAGE PASTE] Processing image file:', file.name, file.type, file.size);
                  this.handleImageUpload(file, view, imageService);
                }
              });
              
              return true;
            }
            
            // Check for pasted text that might be an image URL
            const text = event.clipboardData?.getData('text/plain');
            console.log('🖼️ [IMAGE PASTE] Pasted text:', text);
            
            if (text) {
              const isDirectImageUrl = imageService.isImageUrl(text);
              console.log('🖼️ [IMAGE PASTE] Is direct image URL:', isDirectImageUrl);
              
              if (isDirectImageUrl) {
                console.log('🖼️ [IMAGE PASTE] Processing direct image URL');
                event.preventDefault();
                this.handleImageFromUrl(text, view, imageService);
                return true;
              } else {
                // Check if it's a Google Images or other redirect URL
                const extractedImageUrl = this.extractImageUrlFromRedirect(text);
                if (extractedImageUrl) {
                  console.log('🖼️ [IMAGE PASTE] Extracted image URL from redirect:', extractedImageUrl);
                  event.preventDefault();
                  this.handleImageFromUrl(extractedImageUrl, view, imageService);
                  return true;
                }
              }
            }
            
            console.log('🖼️ [IMAGE PASTE] No image content found, allowing default paste');
            return false;
          },
          
          handleDrop: (view, event) => {
            console.log('🖼️ [IMAGE DROP] Drop event detected');
            console.log('🖼️ [IMAGE DROP] DataTransfer:', event.dataTransfer);
            
            const files = Array.from(event.dataTransfer?.files || []);
            console.log('🖼️ [IMAGE DROP] Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
            
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            console.log('🖼️ [IMAGE DROP] Image files:', imageFiles.length);
            
            if (imageFiles.length > 0) {
              console.log('🖼️ [IMAGE DROP] Processing dropped images');
              event.preventDefault();
              event.stopPropagation();
              
              imageFiles.forEach(file => {
                console.log('🖼️ [IMAGE DROP] Processing file:', file.name);
                this.handleImageUpload(file, view, imageService);
              });
              
              return true;
            }
            
            console.log('🖼️ [IMAGE DROP] No image files found');
            return false;
          },

          handleDOMEvents: {
            dragover: (view, event) => {
              console.log('🖼️ [IMAGE DRAG] Dragover event, types:', event.dataTransfer?.types);
              // Check if dragged items include files
              if (event.dataTransfer?.types.includes('Files')) {
                console.log('🖼️ [IMAGE DRAG] Files detected in dragover');
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              return false;
            },

            dragenter: (view, event) => {
              console.log('🖼️ [IMAGE DRAG] Dragenter event, types:', event.dataTransfer?.types);
              // Check if dragged items include files
              if (event.dataTransfer?.types.includes('Files')) {
                console.log('🖼️ [IMAGE DRAG] Files detected in dragenter');
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              return false;
            },

            dragleave: (view, event) => {
              console.log('🖼️ [IMAGE DRAG] Dragleave event');
              // Prevent default to avoid any unwanted behavior
              if (event.dataTransfer?.types.includes('Files')) {
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },

  handleImageUpload(file: File, view: EditorView, imageService: ImageService) {
    console.log('🖼️ [IMAGE UPLOAD] Starting upload for file:', file.name, file.type, file.size);
    
    const { tr } = view.state;
    const pos = view.state.selection.from;
    
    // Insert placeholder image
    const placeholderNode = this.type.create({
      src: '',
      alt: 'Uploading...',
      loading: true,
    });
    
    tr.insert(pos, placeholderNode);
    view.dispatch(tr);
    console.log('🖼️ [IMAGE UPLOAD] Placeholder inserted at position:', pos);
    
    // Get current user ID
    const uid = this.getCurrentUserId();
    console.log('🖼️ [IMAGE UPLOAD] Current user ID:', uid);
    
    if (!uid) {
      console.error('🖼️ [IMAGE UPLOAD] User not authenticated');
      this.options.onError?.(new Error('User not authenticated'));
      return;
    }
    
    // Upload image
    imageService.uploadImage(file, uid)
      .then(result => {
        // Find the placeholder and replace it
        const newTr = view.state.tr;
        let found = false;
        
        view.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type === this.type && node.attrs.loading && !found) {
            newTr.setNodeMarkup(pos, undefined, {
              src: result.url,
              alt: file.name,
              loading: false,
              error: false,
            });
            found = true;
          }
        });
        
        if (found) {
          view.dispatch(newTr);
          
          // Call onImageUploaded callback
          if (this.options.onImageUploaded) {
            this.options.onImageUploaded({
              filename: result.filename,
              url: result.url,
              size: result.size,
              type: result.type,
              uploadedAt: new Date()
            });
          }
        }
      })
      .catch(error => {
        console.error('Image upload failed:', error);
        
        // Replace placeholder with error state
        const newTr = view.state.tr;
        let found = false;
        
        view.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type === this.type && node.attrs.loading && !found) {
            newTr.setNodeMarkup(pos, undefined, {
              src: '',
              alt: 'Upload failed',
              loading: false,
              error: true,
            });
            found = true;
          }
        });
        
        if (found) {
          view.dispatch(newTr);
        }
        
        this.options.onError?.(error);
      });
  },

  handleImageFromUrl(url: string, view: EditorView, imageService: ImageService) {
    const { tr } = view.state;
    const pos = view.state.selection.from;
    
    // Insert placeholder image
    const placeholderNode = this.type.create({
      src: '',
      alt: 'Loading image...',
      loading: true,
    });
    
    tr.insert(pos, placeholderNode);
    view.dispatch(tr);
    
    // Get current user ID
    const uid = this.getCurrentUserId();
    
    if (!uid) {
      this.options.onError?.(new Error('User not authenticated'));
      return;
    }
    
    // Upload image from URL
    imageService.uploadImageFromUrl(url, uid)
      .then(result => {
        // Find the placeholder and replace it
        const newTr = view.state.tr;
        let found = false;
        
        view.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type === this.type && node.attrs.loading && !found) {
            newTr.setNodeMarkup(pos, undefined, {
              src: result.url,
              alt: 'Image',
              loading: false,
              error: false,
            });
            found = true;
          }
        });
        
        if (found) {
          view.dispatch(newTr);
          
          // Call onImageUploaded callback
          if (this.options.onImageUploaded) {
            this.options.onImageUploaded({
              filename: result.filename,
              url: result.url,
              size: result.size,
              type: result.type,
              uploadedAt: new Date()
            });
          }
        }
      })
      .catch(error => {
        console.error('Image upload from URL failed:', error);
        
        // Replace placeholder with error state
        const newTr = view.state.tr;
        let found = false;
        
        view.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type === this.type && node.attrs.loading && !found) {
            newTr.setNodeMarkup(pos, undefined, {
              src: '',
              alt: 'Failed to load image',
              loading: false,
              error: true,
            });
            found = true;
          }
        });
        
        if (found) {
          view.dispatch(newTr);
        }
        
        this.options.onError?.(error);
      });
  },

  getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  },

  extractImageUrlFromRedirect(url: string): string | null {
    try {
      console.log('🖼️ [URL EXTRACT] Processing URL:', url);
      
      // Handle Google Images URLs
      if (url.includes('google.com') && url.includes('imgurl=')) {
        const match = url.match(/imgurl=([^&]+)/);
        if (match) {
          const imageUrl = decodeURIComponent(match[1]);
          console.log('🖼️ [URL EXTRACT] Extracted from Google Images:', imageUrl);
          return imageUrl;
        }
      }
      
      // Handle other redirect patterns (add more as needed)
      const urlObj = new URL(url);
      const urlParam = urlObj.searchParams.get('url');
      if (urlParam) {
        const decodedUrl = decodeURIComponent(urlParam);
        const imageService = new ImageService();
        if (imageService.isImageUrl(decodedUrl)) {
          console.log('🖼️ [URL EXTRACT] Extracted from URL param:', decodedUrl);
          return decodedUrl;
        }
      }
      
      console.log('🖼️ [URL EXTRACT] No image URL found in redirect');
      return null;
    } catch (error) {
      console.error('🖼️ [URL EXTRACT] Error extracting URL:', error);
      return null;
    }
  },

  isImageUrl(url: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = url.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension || '');
  },
});