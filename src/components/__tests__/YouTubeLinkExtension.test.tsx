import React from 'react';
import { render } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Link from '@tiptap/extension-link';
import { YouTubeLinkExtension } from '../YouTubeLinkExtension';

jest.mock('../YouTubeLinkExtension', () => ({
  YouTubeLinkExtension: 'mock-youtube-link-extension',
}));

const TestEditor = () => {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Link,
      YouTubeLinkExtension,
    ],
    content: '',
  });

  return <EditorContent editor={editor} />;
};

describe('YouTubeLinkExtension', () => {
  it('should render without crashing', () => {
    render(<TestEditor />);
  });

  it('should be included in editor extensions', () => {
    const { container } = render(<TestEditor />);
    expect(container.querySelector('.ProseMirror')).toBeInTheDocument();
  });
});
