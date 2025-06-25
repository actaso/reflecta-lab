import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Clerk
const mockUseUser = jest.fn();
jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signin-button">{children}</div>
  ),
  UserButton: () => <div data-testid="user-button">User Avatar</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
}));

// Mock TipTap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
  })),
  EditorContent: () => <div data-testid="editor-content">Mock Editor</div>,
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

// Import the main app component
import JournalApp from '../app/page';

describe('Authentication Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // Reset environment variables
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });

  describe('Data Accessibility Without Signin', () => {
    beforeEach(() => {
      // Setup test data in localStorage
      const testEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Test entry without auth</p>',
          },
        ],
      };
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testEntries));
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    });

    it('should load and display entries without authentication', () => {
      render(<JournalApp />);

      // Should load data from localStorage regardless of auth state
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('journal-entries');
      
      // Should display the entry
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
    });

    it('should allow creating new entries without authentication', async () => {
      render(<JournalApp />);

      // Create new entry with Cmd+Enter
      await user.keyboard('{Meta>}Enter{/Meta}');

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'journal-entries',
        expect.any(String)
      );
    });

    it('should allow editing entries without authentication', () => {
      render(<JournalApp />);

      // Should render editor for the test entry
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should allow deleting entries without authentication', async () => {
      render(<JournalApp />);

      // Find and click delete button
      const deleteButton = screen.getByTitle('Delete entry');
      await user.click(deleteButton);

      // Should update localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Data Accessibility With Signin', () => {
    beforeEach(() => {
      // Setup Clerk configuration
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      
      // Setup test data in localStorage
      const testEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Test entry with auth</p>',
          },
        ],
      };
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testEntries));
      mockUseUser.mockReturnValue({ 
        isSignedIn: true, 
        user: { id: 'user_123', firstName: 'John' }
      });
    });

    it('should load and display entries when signed in', () => {
      render(<JournalApp />);

      // Should still load data from localStorage
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('journal-entries');
      
      // Should display the entry
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
    });

    it('should allow full functionality when signed in', async () => {
      render(<JournalApp />);

      // Should show user button instead of signin
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-button')).not.toBeInTheDocument();

      // Should allow creating entries
      await user.keyboard('{Meta>}Enter{/Meta}');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Should render editor
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Authentication State Changes', () => {
    it('should maintain data when transitioning from anonymous to signed in', () => {
      // Start anonymous
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
      
      const testEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Anonymous entry</p>',
          },
        ],
      };
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testEntries));

      const { rerender } = render(<JournalApp />);

      // Verify data loads
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();

      // Simulate signing in
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      mockUseUser.mockReturnValue({ 
        isSignedIn: true, 
        user: { id: 'user_123', firstName: 'John' }
      });

      rerender(<JournalApp />);

      // Data should still be available
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('should maintain data when transitioning from signed in to anonymous', () => {
      // Start signed in
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      mockUseUser.mockReturnValue({ 
        isSignedIn: true, 
        user: { id: 'user_123', firstName: 'John' }
      });
      
      const testEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Signed in entry</p>',
          },
        ],
      };
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testEntries));

      const { rerender } = render(<JournalApp />);

      // Verify data loads and user is signed in
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
      expect(screen.getByTestId('user-button')).toBeInTheDocument();

      // Simulate signing out
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });

      rerender(<JournalApp />);

      // Data should still be available
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
      expect(screen.getByTestId('signin-button')).toBeInTheDocument();
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
    });
  });

  describe('No Authentication Configuration', () => {
    beforeEach(() => {
      // No Clerk environment variables
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
      
      const testEntries = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>No auth entry</p>',
          },
        ],
      };
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testEntries));
    });

    it('should provide full functionality without any authentication setup', () => {
      render(<JournalApp />);

      // Should show disabled signin button
      const signinButton = screen.getByRole('button', { name: /authentication not configured/i });
      expect(signinButton).toBeDisabled();

      // Should load and display data
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();

      // Should allow editing
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should save data properly without authentication', async () => {
      render(<JournalApp />);

      // Create new entry
      await user.keyboard('{Meta>}Enter{/Meta}');

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'journal-entries',
        expect.any(String)
      );
    });
  });

  describe('Data Persistence Consistency', () => {
    it('should use localStorage as primary storage in all authentication states', () => {
      const testData = {
        '2024-03-15': [
          {
            id: '1',
            timestamp: '2024-03-15T10:30:00.000Z',
            content: '<p>Persistent entry</p>',
          },
        ],
      };

      // Test 1: No auth configuration
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
      mockLocalStorage.setItem('journal-entries', JSON.stringify(testData));
      
      const { rerender } = render(<JournalApp />);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('journal-entries');

      // Test 2: Auth configured, not signed in
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      rerender(<JournalApp />);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('journal-entries');

      // Test 3: Auth configured, signed in
      mockUseUser.mockReturnValue({ 
        isSignedIn: true, 
        user: { id: 'user_123' }
      });
      rerender(<JournalApp />);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('journal-entries');

      // All states should have the same data access pattern
      expect(screen.getByText(/Friday, March 15/)).toBeInTheDocument();
    });

    it('should maintain consistent save behavior across authentication states', async () => {
      // Test data modifications work in all states
      const testScenarios = [
        { env: false, signedIn: false, description: 'no auth config' },
        { env: true, signedIn: false, description: 'auth config, not signed in' },
        { env: true, signedIn: true, description: 'auth config, signed in' },
      ];

      for (const scenario of testScenarios) {
        jest.clearAllMocks();
        mockLocalStorage.clear();

        if (scenario.env) {
          (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
        } else {
          delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
        }

        mockUseUser.mockReturnValue({ 
          isSignedIn: scenario.signedIn, 
          user: scenario.signedIn ? { id: 'user_123' } : null
        });

        const { unmount } = render(<JournalApp />);

        // Create new entry
        await user.keyboard('{Meta>}Enter{/Meta}');

        // Should save to localStorage in all scenarios
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'journal-entries',
          expect.any(String)
        );

        unmount();
      }
    });
  });
});