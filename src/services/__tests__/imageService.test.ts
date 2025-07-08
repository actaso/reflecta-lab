import { ImageService } from '../imageService';

// Mock Firebase Storage
jest.mock('@/lib/firebase', () => ({
  storage: {}
}));

// Mock Firebase Storage functions
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

describe('ImageService', () => {
  let imageService: ImageService;

  beforeEach(() => {
    imageService = new ImageService();
  });

  describe('isImageUrl', () => {
    it('should return true for valid image URLs', () => {
      expect(imageService.isImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(imageService.isImageUrl('https://example.com/image.jpeg')).toBe(true);
      expect(imageService.isImageUrl('https://example.com/image.png')).toBe(true);
      expect(imageService.isImageUrl('https://example.com/image.gif')).toBe(true);
      expect(imageService.isImageUrl('https://example.com/image.webp')).toBe(true);
      expect(imageService.isImageUrl('https://example.com/image.JPG')).toBe(true);
    });

    it('should return false for non-image URLs', () => {
      expect(imageService.isImageUrl('https://example.com/document.pdf')).toBe(false);
      expect(imageService.isImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(imageService.isImageUrl('https://example.com/page.html')).toBe(false);
      expect(imageService.isImageUrl('not-a-url')).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should throw error for invalid file type', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (imageService as any).validateFile(invalidFile);
      }).toThrow('Invalid file type');
    });

    it('should throw error for file too large', () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (imageService as any).validateFile(largeFile);
      }).toThrow('File too large');
    });

    it('should not throw for valid file', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (imageService as any).validateFile(validFile);
      }).not.toThrow();
    });
  });

  describe('generateFilename', () => {
    it('should generate unique filename with timestamp and random string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filename1 = (imageService as any).generateFilename('test.jpg');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filename2 = (imageService as any).generateFilename('test.jpg');
      
      expect(filename1).toMatch(/^\d+_[a-z0-9]{6}\.jpg$/);
      expect(filename2).toMatch(/^\d+_[a-z0-9]{6}\.jpg$/);
      expect(filename1).not.toBe(filename2);
    });

    it('should preserve file extension', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filename = (imageService as any).generateFilename('test.png');
      expect(filename).toMatch(/\.png$/);
    });

    it('should default to jpg extension if none provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filename = (imageService as any).generateFilename('test');
      expect(filename).toMatch(/\.jpg$/);
    });
  });
});