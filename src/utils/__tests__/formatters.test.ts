import { formatDate, formatDisplayDate, formatTime, stripHtml, countWords, calculateLineWidth } from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-03-15');
    });

    it('should handle different dates correctly', () => {
      const date1 = new Date('2023-12-01T00:00:00Z');
      const date2 = new Date('2024-01-31T23:59:59Z');
      
      expect(formatDate(date1)).toBe('2023-12-01');
      expect(formatDate(date2)).toBe('2024-01-31');
    });

    it('should pad single digits with zeros', () => {
      const date = new Date('2024-01-05T00:00:00Z');
      expect(formatDate(date)).toBe('2024-01-05');
    });
  });

  describe('formatDisplayDate', () => {
    it('should format date as "Weekday, Month Day"', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDisplayDate(date);
      expect(result).toMatch(/Friday, March 15/);
    });

    it('should handle different weekdays and months', () => {
      const monday = new Date('2024-01-01T10:30:00Z');
      const result = formatDisplayDate(monday);
      expect(result).toMatch(/Monday, January 1/);
    });
  });

  describe('formatTime', () => {
    it('should format time in 12-hour format with AM/PM', () => {
      const morning = new Date('2024-03-15T09:30:00Z');
      const evening = new Date('2024-03-15T21:45:00Z');
      const noon = new Date('2024-03-15T12:00:00Z');
      const midnight = new Date('2024-03-15T00:00:00Z');

      expect(formatTime(morning)).toMatch(/AM/);
      expect(formatTime(evening)).toMatch(/PM/);
      expect(formatTime(noon)).toMatch(/PM/);
      expect(formatTime(midnight)).toMatch(/AM/);
    });

    it('should include hours and minutes', () => {
      const time = new Date('2024-03-15T14:30:00Z');
      const result = formatTime(time);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags and return plain text', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      expect(stripHtml(html)).toBe('Hello world!');
    });

    it('should handle nested HTML tags', () => {
      const html = '<div><p>Nested <em>content</em> with <a href="#">links</a></p></div>';
      expect(stripHtml(html)).toBe('Nested content with links');
    });

    it('should handle HTML with attributes', () => {
      const html = '<p class="highlight" style="color: red;">Styled text</p>';
      expect(stripHtml(html)).toBe('Styled text');
    });

    it('should return empty string for empty HTML', () => {
      expect(stripHtml('')).toBe('');
      expect(stripHtml('<div></div>')).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const text = 'Just plain text';
      expect(stripHtml(text)).toBe('Just plain text');
    });

    it('should handle HTML entities', () => {
      const html = '<p>Hello &amp; welcome!</p>';
      expect(stripHtml(html)).toBe('Hello & welcome!');
    });
  });

  describe('countWords', () => {
    it('should count words in plain text', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('The quick brown fox jumps')).toBe(5);
    });

    it('should strip HTML before counting words', () => {
      const html = '<p>Hello <strong>world</strong> from <em>HTML</em>!</p>';
      expect(countWords(html)).toBe(4); // "Hello", "world", "from", "HTML!"
    });

    it('should handle multiple spaces and line breaks', () => {
      expect(countWords('Hello   world\n\nwith   spaces')).toBe(4);
    });

    it('should return 0 for empty content', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('<div></div>')).toBe(0);
    });

    it('should handle punctuation correctly', () => {
      expect(countWords('Hello, world! How are you?')).toBe(5);
    });

    it('should handle complex HTML with formatting', () => {
      const html = `
        <h1>Title</h1>
        <p>This is a <strong>test</strong> paragraph with <em>formatting</em>.</p>
        <ul>
          <li>Item one</li>
          <li>Item two</li>
        </ul>
      `;
      expect(countWords(html)).toBe(12); // Title, This, is, a, test, paragraph, with, formatting, Item, one, Item, two
    });
  });

  describe('calculateLineWidth', () => {
    it('should return minimum width of 10px for zero words', () => {
      expect(calculateLineWidth(0)).toBe(10);
    });

    it('should return minimum width of 10px for small word counts', () => {
      expect(calculateLineWidth(5)).toBe(10);
      expect(calculateLineWidth(15)).toBe(10);
    });

    it('should scale proportionally between 10px and 20px', () => {
      expect(calculateLineWidth(50)).toBe(Math.max(Math.min((50 / 200) * 20, 20), 10));
      expect(calculateLineWidth(100)).toBe(Math.max(Math.min((100 / 200) * 20, 20), 10));
      expect(calculateLineWidth(150)).toBe(Math.max(Math.min((150 / 200) * 20, 20), 10));
    });

    it('should return maximum width of 20px for 200+ words', () => {
      expect(calculateLineWidth(200)).toBe(20);
      expect(calculateLineWidth(300)).toBe(20);
      expect(calculateLineWidth(1000)).toBe(20);
    });

    it('should handle edge cases around the scaling boundaries', () => {
      // At exactly 200 words, should be 20px
      expect(calculateLineWidth(200)).toBe(20);
      
      // At 100 words (halfway), should be 10px (since min is 10px and 100/200 * 20 = 10)
      expect(calculateLineWidth(100)).toBe(10);
      
      // Just above minimum threshold should still return minimum
      expect(calculateLineWidth(20)).toBe(10);
    });
  });
});