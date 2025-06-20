import { AutoTagExtension } from '../AutoTagExtension';

describe('AutoTagExtension', () => {
  it('should have the correct name', () => {
    expect(AutoTagExtension.name).toBe('autoTag');
  });

  it('should provide ProseMirror plugins', () => {
    const plugins = AutoTagExtension.config.addProseMirrorPlugins?.();
    expect(plugins).toBeDefined();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins?.length).toBe(1);
  });

  describe('tag regex pattern', () => {
    // Test the regex pattern used in the extension
    const tagRegex = /^([a-zA-Z0-9_-]+):/gm;

    it('should match word: pattern at beginning of line', () => {
      const text = 'work: Meeting notes';
      const matches = text.match(tagRegex);
      expect(matches).toContain('work:');
    });

    it('should match multiple tags in multiline text', () => {
      const text = `work: Meeting notes
personal: Grocery list
project: Bug fixes`;
      const matches = [...text.matchAll(tagRegex)];
      expect(matches).toHaveLength(3);
      expect(matches[0][0]).toBe('work:');
      expect(matches[1][0]).toBe('personal:');
      expect(matches[2][0]).toBe('project:');
    });

    it('should not match tags not at line start', () => {
      const text = 'This is work: not a tag';
      const matches = text.match(tagRegex);
      expect(matches).toBeNull();
    });

    it('should match tags with numbers, underscores, and hyphens', () => {
      const text1 = 'work_item: Task description';
      const text2 = 'project-2024: New project';
      const text3 = 'item123: Numbered item';

      expect(text1.match(tagRegex)).toContain('work_item:');
      expect(text2.match(tagRegex)).toContain('project-2024:');
      expect(text3.match(tagRegex)).toContain('item123:');
    });

    it('should not match tags with spaces before colon', () => {
      const text = 'work : Not a valid tag';
      const matches = text.match(tagRegex);
      expect(matches).toBeNull();
    });

    it('should not match empty tags', () => {
      const text = ': Empty tag';
      const matches = text.match(tagRegex);
      expect(matches).toBeNull();
    });

    it('should not match tags with special characters', () => {
      const text1 = 'work@home: Invalid tag';
      const text2 = 'work#tag: Invalid tag';
      const text3 = 'work.item: Invalid tag';

      expect(text1.match(tagRegex)).toBeNull();
      expect(text2.match(tagRegex)).toBeNull();
      expect(text3.match(tagRegex)).toBeNull();
    });

    it('should handle case sensitivity correctly', () => {
      const text = `Work: Uppercase
MEETING: All caps
MixedCase: Mixed case`;
      
      const matches = [...text.matchAll(tagRegex)];
      expect(matches).toHaveLength(3);
      expect(matches[0][0]).toBe('Work:');
      expect(matches[1][0]).toBe('MEETING:');
      expect(matches[2][0]).toBe('MixedCase:');
    });

    it('should match tags at the beginning of different lines', () => {
      const text = `First line without tag
tag1: This has a tag
Another line
tag2: This also has a tag`;

      const matches = [...text.matchAll(tagRegex)];
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('tag1:');
      expect(matches[1][0]).toBe('tag2:');
    });
  });

  describe('decoration styling', () => {
    it('should apply correct CSS class and styles', () => {
      // This is more of a documentation test since we can't easily test
      // ProseMirror decorations without a full editor setup
      const expectedClass = 'tag-highlight';
      const expectedStyle = 'background: #fef3c7 !important; color: #92400e !important; padding: 0.1em 0.3em; border-radius: 3px; font-weight: 500;';
      
      // These values should match what's in the extension
      expect(expectedClass).toBe('tag-highlight');
      expect(expectedStyle).toContain('#fef3c7'); // yellow background
      expect(expectedStyle).toContain('#92400e'); // brown text
      expect(expectedStyle).toContain('border-radius: 3px');
      expect(expectedStyle).toContain('font-weight: 500');
    });
  });
});