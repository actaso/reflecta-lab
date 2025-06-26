import { extractYouTubeVideoId, isYouTubeUrl, fetchYouTubeVideoTitle } from '../youtube';

global.fetch = jest.fn();

describe('YouTube utilities', () => {
  describe('extractYouTubeVideoId', () => {
    it('should extract video ID from youtube.com/watch URLs', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be URLs', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=30s')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from YouTube Shorts URLs', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for non-YouTube URLs', () => {
      expect(extractYouTubeVideoId('https://example.com')).toBeNull();
      expect(extractYouTubeVideoId('not a url')).toBeNull();
    });
  });

  describe('isYouTubeUrl', () => {
    it('should return true for valid YouTube URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    });

    it('should return false for non-YouTube URLs', () => {
      expect(isYouTubeUrl('https://example.com')).toBe(false);
      expect(isYouTubeUrl('not a url')).toBe(false);
    });
  });

  describe('fetchYouTubeVideoTitle', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'test-api-key';
    });

    afterEach(() => {
      jest.resetAllMocks();
      delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    });

    it('should return video title when API call succeeds', async () => {
      const mockResponse = {
        items: [
          {
            snippet: {
              title: 'Test Video Title'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const title = await fetchYouTubeVideoTitle('dQw4w9WgXcQ');
      expect(title).toBe('Test Video Title');
    });

    it('should return null when API key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      
      const title = await fetchYouTubeVideoTitle('dQw4w9WgXcQ');
      expect(title).toBeNull();
    });

    it('should return null when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const title = await fetchYouTubeVideoTitle('dQw4w9WgXcQ');
      expect(title).toBeNull();
    });

    it('should return null when video is not found', async () => {
      const mockResponse = {
        items: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const title = await fetchYouTubeVideoTitle('invalid-id');
      expect(title).toBeNull();
    });
  });
});
