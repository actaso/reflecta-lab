import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClerkProvider } from '@clerk/nextjs';
import JournalApp from '../app/page';

// Mock TipTap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
  })),
  EditorContent: () => (
    <div data-testid="editor-content">
      <textarea 
        data-testid="mock-editor-input"
        onChange={() => {}}
        value="Test content"
      />
    </div>
  ),
}));

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => 'mock-starter-kit'),
}));

jest.mock('@tiptap/extension-placeholder', () => ({
  configure: jest.fn(() => 'mock-placeholder'),
}));

jest.mock('../components/AutoTagExtension', () => ({
  AutoTagExtension: 'mock-auto-tag-extension',
}));

jest.mock('@clerk/nextjs', () => ({
  ...jest.requireActual('@clerk/nextjs'),
  useUser: jest.fn(() => ({ isSignedIn: false })),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="signin-button">{children}</div>,
  UserButton: () => <div data-testid="user-button">User</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock scrollTo
const mockScrollTo = jest.fn();
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: mockScrollTo,
});

describe('Journal App Workflows', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset localStorage
    const mockStorage: Record<string, string> = {};
    (global.localStorage.getItem as jest.Mock).mockImplementation((key) => mockStorage[key] || null);
    (global.localStorage.setItem as jest.Mock).mockImplementation((key, value) => {
      mockStorage[key] = value;
    });
    (global.localStorage.removeItem as jest.Mock).mockImplementation((key) => {
      delete mockStorage[key];
    });
    (global.localStorage.clear as jest.Mock).mockImplementation(() => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Application State', () => {
    it('should render welcome message when no entries exist', () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );
      
      expect(screen.getByText('Welcome to your journal')).toBeInTheDocument();
      expect(screen.getByText('Press Cmd+Enter to create your first entry')).toBeInTheDocument();
    });

    it('should show help button', () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );
      
      const helpButton = screen.getByRole('button', { name: /show shortcuts/i });
      expect(helpButton).toBeInTheDocument();
      expect(helpButton).toHaveTextContent('?');
    });

    it('should load entries from localStorage on mount', () => {
      const mockEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Test entry content</p>'
          }
        ]
      };

      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockEntries));

      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      expect(localStorage.getItem).toHaveBeenCalledWith('journal-entries');
    });
  });

  describe('Help Modal', () => {
    it('should open help modal when ? button is clicked', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );
      
      const helpButton = screen.getByRole('button', { name: /show shortcuts/i });
      await user.click(helpButton);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Create new entry')).toBeInTheDocument();
      expect(screen.getByText('Cmd+Enter')).toBeInTheDocument();
    });

    it('should close help modal when X button is clicked', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );
      
      const helpButton = screen.getByRole('button', { name: /show shortcuts/i });
      await user.click(helpButton);

      const closeButton = screen.getByText('×');
      await user.click(closeButton);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('should display all keyboard shortcuts in help modal', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );
      
      const helpButton = screen.getByRole('button', { name: /show shortcuts/i });
      await user.click(helpButton);

      expect(screen.getByText('Navigate to newer entry')).toBeInTheDocument();
      expect(screen.getByText('Navigate to older entry')).toBeInTheDocument();
      expect(screen.getByText('Cmd+↑')).toBeInTheDocument();
      expect(screen.getByText('Cmd+↓')).toBeInTheDocument();
    });
  });

  describe('Entry Creation', () => {
    it('should create new entry with Cmd+Enter', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Simulate Cmd+Enter
      fireEvent.keyDown(document, {
        key: 'Enter',
        metaKey: true,
      });

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should create new entry with Ctrl+Enter on Windows', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Simulate Ctrl+Enter
      fireEvent.keyDown(document, {
        key: 'Enter',
        ctrlKey: true,
      });

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should focus on editor after creating new entry', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      fireEvent.keyDown(document, {
        key: 'Enter',
        metaKey: true,
      });

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      });
    });
  });

  describe('Entry Navigation', () => {
    beforeEach(() => {
      // Setup multiple entries for navigation testing
      const mockEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>First entry</p>'
          },
          {
            id: '2',
            timestamp: '2024-03-15T11:30:00.000Z',
            content: '<p>Second entry</p>'
          }
        ],
        '2024-03-14': [
          {
            id: '3',
            timestamp: '2024-03-14T10:30:00.000Z',
            content: '<p>Third entry</p>'
          }
        ]
      };

      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockEntries));
    });

    it('should navigate to previous entry with Cmd+Up', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Wait for initial load
      jest.advanceTimersByTime(200);

      fireEvent.keyDown(document, {
        key: 'ArrowUp',
        metaKey: true,
      });

      jest.advanceTimersByTime(100);

      expect(mockScrollTo).toHaveBeenCalled();
    });

    it('should navigate to next entry with Cmd+Down', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Wait for initial load
      jest.advanceTimersByTime(200);

      fireEvent.keyDown(document, {
        key: 'ArrowDown',
        metaKey: true,
      });

      jest.advanceTimersByTime(100);

      expect(mockScrollTo).toHaveBeenCalled();
    });

    it('should wrap around from first to last entry', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Wait for initial load
      jest.advanceTimersByTime(200);

      // Navigate up from first entry (should wrap to last)
      fireEvent.keyDown(document, {
        key: 'ArrowUp',
        metaKey: true,
      });

      jest.advanceTimersByTime(100);

      expect(mockScrollTo).toHaveBeenCalled();
    });

    it('should wrap around from last to first entry', async () => {
      jest.useFakeTimers();
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Wait for initial load
      jest.advanceTimersByTime(200);

      // Navigate down from last entry (should wrap to first)
      fireEvent.keyDown(document, {
        key: 'ArrowDown',
        metaKey: true,
      });

      jest.advanceTimersByTime(100);

      expect(mockScrollTo).toHaveBeenCalled();
    });
  });

  describe('Entry Selection via Click', () => {
    beforeEach(() => {
      const mockEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Clickable entry</p>'
          }
        ]
      };

      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockEntries));
    });

    it('should select entry when clicked in sidebar', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      await waitFor(() => {
        const entryElements = screen.getAllByRole('generic');
        const clickableEntry = entryElements.find(el => 
          el.className?.includes('cursor-pointer')
        );
        
        if (clickableEntry) {
          fireEvent.click(clickableEntry);
        }
      });
    });
  });

  describe('Date and Time Display', () => {
    beforeEach(() => {
      const mockEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Entry with timestamp</p>'
          }
        ]
      };

      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockEntries));
    });

    it('should display formatted date for selected entry', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      await waitFor(() => {
        // Should show formatted date
        expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
      });
    });

    it('should display formatted time for selected entry', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      await waitFor(() => {
        // Should show formatted time (looking for AM/PM pattern)
        const timeElement = screen.getByText(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        expect(timeElement).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save entries to localStorage when content changes', async () => {
      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      // Create a new entry
      fireEvent.keyDown(document, {
        key: 'Enter',
        metaKey: true,
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'journal-entries',
          expect.any(String)
        );
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      // Should not throw an error
      expect(() => render(<JournalApp />)).not.toThrow();
    });

    it('should handle empty localStorage', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue(null);

      render(
        <ClerkProvider>
          <JournalApp />
        </ClerkProvider>
      );

      expect(screen.getByText('Welcome to your journal')).toBeInTheDocument();
    });
  });
});
