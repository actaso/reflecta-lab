import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import Editor from '../Editor';

// Mock TipTap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: { editor?: unknown }) => (
    <div data-testid="editor-content" data-editor-id={(editor as { id?: string })?.id || 'mock-editor'} />
  ),
}));

jest.mock('@tiptap/extension-document', () => 'mock-document');
jest.mock('@tiptap/extension-paragraph', () => 'mock-paragraph');
jest.mock('@tiptap/extension-text', () => 'mock-text');
jest.mock('@tiptap/extension-heading', () => ({
  configure: jest.fn(() => 'mock-heading'),
}));
jest.mock('@tiptap/extension-bold', () => 'mock-bold');
jest.mock('@tiptap/extension-italic', () => 'mock-italic');
jest.mock('@tiptap/extension-code', () => 'mock-code');
jest.mock('@tiptap/extension-blockquote', () => 'mock-blockquote');
jest.mock('@tiptap/extension-hard-break', () => 'mock-hard-break');
jest.mock('@tiptap/extension-history', () => 'mock-history');

jest.mock('@tiptap/extension-placeholder', () => ({
  configure: jest.fn(() => 'mock-placeholder'),
}));

jest.mock('@tiptap/extension-link', () => ({
  configure: jest.fn(() => 'mock-link'),
}));

jest.mock('@tiptap/extension-task-list', () => 'mock-task-list');

jest.mock('@tiptap/extension-task-item', () => ({
  configure: jest.fn(() => 'mock-task-item'),
}));

jest.mock('@tiptap/extension-bullet-list', () => 'mock-bullet-list');
jest.mock('@tiptap/extension-list-item', () => 'mock-list-item');

jest.mock('../AutoTagExtension', () => ({
  AutoTagExtension: 'mock-auto-tag-extension',
}));

const mockUseEditor = useEditor as jest.MockedFunction<typeof useEditor>;

describe('Editor', () => {
  const mockOnChange = jest.fn();
  const mockEditor = {
    id: 'test-editor',
    getHTML: jest.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditor.mockReturnValue(mockEditor as unknown);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render EditorContent', () => {
    const { getByTestId } = render(
      <Editor content="Initial content" onChange={mockOnChange} />
    );

    expect(getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should initialize useEditor with correct configuration', () => {
    const content = 'Test content';
    const placeholder = 'Enter text here...';

    render(
      <Editor 
        content={content} 
        onChange={mockOnChange} 
        placeholder={placeholder}
        autoFocus={true}
      />
    );

    expect(mockUseEditor).toHaveBeenCalledWith({
      extensions: [
        'mock-document',
        'mock-paragraph',
        'mock-text',
        'mock-heading',
        'mock-bold',
        'mock-italic',
        'mock-code',
        'mock-blockquote',
        'mock-hard-break',
        'mock-history',
        'mock-placeholder',
        'mock-link',
        'mock-task-list',
        'mock-task-item',
        'mock-bullet-list',
        'mock-list-item',
        'mock-auto-tag-extension',
      ],
      content,
      autofocus: true,
      immediatelyRender: false,
      onUpdate: expect.any(Function),
      editorProps: {
        attributes: {
          class: 'max-w-none focus:outline-none',
        },
      },
    });
  });

  it('should call onChange when editor content updates', () => {
    render(<Editor content="Initial" onChange={mockOnChange} />);

    // Get the onUpdate callback that was passed to useEditor
    const onUpdateCallback = mockUseEditor.mock.calls[0][0].onUpdate;
    
    // Simulate editor update
    onUpdateCallback({ editor: mockEditor });

    expect(mockOnChange).toHaveBeenCalledWith('<p>Test content</p>');
  });

  it('should update editor content when content prop changes', async () => {
    const { rerender } = render(
      <Editor content="Initial content" onChange={mockOnChange} />
    );

    // Change content prop
    rerender(
      <Editor content="Updated content" onChange={mockOnChange} />
    );

    await waitFor(() => {
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('Updated content');
    });
  });

  it('should not update editor if content is the same', async () => {
    mockEditor.getHTML.mockReturnValue('Same content');

    const { rerender } = render(
      <Editor content="Same content" onChange={mockOnChange} />
    );

    // Re-render with same content
    rerender(
      <Editor content="Same content" onChange={mockOnChange} />
    );

    await waitFor(() => {
      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });
  });

  it('should focus editor when autoFocus prop is true', async () => {
    jest.useFakeTimers();

    render(
      <Editor content="Content" onChange={mockOnChange} autoFocus={true} />
    );

    // Fast-forward timer
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockEditor.commands.focus).toHaveBeenCalled();
    });
  });

  it('should not focus editor when autoFocus prop is false', async () => {
    jest.useFakeTimers();

    render(
      <Editor content="Content" onChange={mockOnChange} autoFocus={false} />
    );

    jest.advanceTimersByTime(200);

    expect(mockEditor.commands.focus).not.toHaveBeenCalled();
  });

  it('should handle editor not being initialized', () => {
    mockUseEditor.mockReturnValue(null);

    const { getByTestId } = render(
      <Editor content="Content" onChange={mockOnChange} />
    );

    expect(getByTestId('editor-content')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should use default placeholder when not provided', () => {
    render(<Editor content="Content" onChange={mockOnChange} />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.arrayContaining(['mock-placeholder']),
      })
    );
  });

  it('should handle autoFocus prop changes', async () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <Editor content="Content" onChange={mockOnChange} autoFocus={false} />
    );

    // Change autoFocus to true
    rerender(
      <Editor content="Content" onChange={mockOnChange} autoFocus={true} />
    );

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockEditor.commands.focus).toHaveBeenCalled();
    });
  });
});
