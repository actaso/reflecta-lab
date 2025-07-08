import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface ImageUploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface ImageUploadOptions {
  maxSize?: number; // in bytes, default 5MB
  allowedTypes?: string[]; // default ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  quality?: number; // compression quality 0-1, default 0.8
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  quality: 0.8
};

export class ImageService {
  private options: Required<ImageUploadOptions>;

  constructor(options: ImageUploadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async uploadImage(file: File, uid: string): Promise<ImageUploadResult> {
    console.log('🖼️ [SERVICE] Starting upload process for user:', uid);
    this.validateFile(file);
    
    const compressedFile = await this.compressImage(file);
    const filename = this.generateFilename(file.name);
    const storagePath = `images/${uid}/${filename}`;
    console.log('🖼️ [SERVICE] Storage path:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    console.log('🖼️ [SERVICE] Storage reference created:', storageRef);
    
    try {
      console.log('🖼️ [SERVICE] Uploading file to Firebase Storage...');
      const snapshot = await uploadBytes(storageRef, compressedFile);
      console.log('🖼️ [SERVICE] Upload successful, getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        filename,
        size: compressedFile.size,
        type: compressedFile.type
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  async uploadImageFromUrl(imageUrl: string, uid: string): Promise<ImageUploadResult> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'image', { type: blob.type });
      
      return await this.uploadImage(file, uid);
    } catch (error) {
      console.error('Error uploading image from URL:', error);
      throw new Error('Failed to upload image from URL');
    }
  }

  async deleteImage(filename: string, uid: string): Promise<void> {
    const storageRef = ref(storage, `images/${uid}/${filename}`);
    
    try {
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  private validateFile(file: File): void {
    if (!this.options.allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${this.options.allowedTypes.join(', ')}`);
    }
    
    if (file.size > this.options.maxSize) {
      throw new Error(`File too large. Maximum size: ${this.options.maxSize / 1024 / 1024}MB`);
    }
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          this.options.quality
        );
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';
    return `${timestamp}_${random}.${extension}`;
  }

  isImageUrl(url: string): boolean {
    try {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      // Parse URL to remove query parameters and fragments
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Get extension from pathname
      const extension = pathname.split('.').pop()?.toLowerCase();
      
      console.log('🖼️ [URL CHECK] Checking URL:', url);
      console.log('🖼️ [URL CHECK] Pathname:', pathname);
      console.log('🖼️ [URL CHECK] Extension:', extension);
      console.log('🖼️ [URL CHECK] Is image:', imageExtensions.includes(extension || ''));
      
      return imageExtensions.includes(extension || '');
    } catch (error) {
      console.error('🖼️ [URL CHECK] Invalid URL:', url, error);
      return false;
    }
  }
}

export const imageService = new ImageService();