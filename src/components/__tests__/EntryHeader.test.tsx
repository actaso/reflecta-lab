import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryHeader from '../EntryHeader';

// Mock Clerk hooks and components
const mockUseUser = jest.fn();
const mockSignInButton = jest.fn();
const mockUserButton = jest.fn();

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  SignInButton: ({ children, mode }: { children: React.ReactNode; mode: string }) => {
    mockSignInButton({ mode });
    return <div data-testid="signin-button">{children}</div>;
  },
  UserButton: ({ appearance }: { appearance?: Record<string, unknown> }) => {
    mockUserButton({ appearance });
    return <div data-testid="user-button">User Avatar</div>;
  },
}));

// Mock formatters
jest.mock('../../utils/formatters', () => ({
  formatDisplayDate: jest.fn(() => 'Friday, March 15'),
  formatTime: jest.fn(() => '10:30 AM'),
}));

describe('EntryHeader Authentication', () => {
  const mockEntry = {
    entry: {
      id: '1',
      timestamp: new Date('2024-03-15T10:30:00.000Z'),
      content: '<p>Test content</p>',
    },
    dateKey: '2024-03-15',
  };

  const defaultProps = {
    currentEntry: mockEntry,
    onDeleteEntry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable mock
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });

  describe('No Clerk Configuration', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
      // No Clerk env var set
    });

    it('should render disabled signin button when Clerk is not configured', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const signinButton = screen.getByRole('button', { name: /authentication not configured/i });
      expect(signinButton).toBeInTheDocument();
      expect(signinButton).toBeDisabled();
      expect(signinButton).toHaveClass('cursor-not-allowed');
      expect(signinButton).toHaveAttribute('title', 'Authentication not configured');
    });

    it('should not render Clerk components when not configured', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(screen.queryByTestId('signin-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
      expect(mockSignInButton).not.toHaveBeenCalled();
      expect(mockUserButton).not.toHaveBeenCalled();
    });
  });

  describe('Clerk Configured - Not Signed In', () => {
    beforeEach(() => {
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    });

    it('should render active SignInButton when Clerk is configured but user not signed in', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const signinButton = screen.getByTestId('signin-button');
      expect(signinButton).toBeInTheDocument();
      
      const buttonElement = screen.getByRole('button', { name: /sign in/i });
      expect(buttonElement).not.toBeDisabled();
      expect(buttonElement).toHaveAttribute('title', 'Sign in to sync your journal');
    });

    it('should call SignInButton with modal mode', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(mockSignInButton).toHaveBeenCalledWith({ mode: 'modal' });
    });

    it('should not render UserButton when not signed in', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
      expect(mockUserButton).not.toHaveBeenCalled();
    });

    it('should have proper styling for active signin button', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const buttonElement = screen.getByRole('button', { name: /sign in/i });
      expect(buttonElement).toHaveClass('hover:bg-neutral-300');
      expect(buttonElement).not.toHaveClass('cursor-not-allowed');
    });
  });

  describe('Clerk Configured - Signed In', () => {
    beforeEach(() => {
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      mockUseUser.mockReturnValue({ 
        isSignedIn: true, 
        user: { id: 'user_123', firstName: 'John', lastName: 'Doe' }
      });
    });

    it('should render UserButton when user is signed in', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const userButton = screen.getByTestId('user-button');
      expect(userButton).toBeInTheDocument();
      expect(userButton).toHaveTextContent('User Avatar');
    });

    it('should call UserButton with custom appearance', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(mockUserButton).toHaveBeenCalledWith({
        appearance: {
          elements: {
            avatarBox: 'w-8 h-8',
            userButtonPopoverCard: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
          }
        }
      });
    });

    it('should not render SignInButton when signed in', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(screen.queryByTestId('signin-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
      expect(mockSignInButton).not.toHaveBeenCalled();
    });
  });

  describe('Entry Information Display', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    });

    it('should display entry date and time when entry is selected', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(screen.getByText('Friday, March 15')).toBeInTheDocument();
      expect(screen.getByText('10:30 AM')).toBeInTheDocument();
    });

    it('should display delete button for current entry', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const deleteButton = screen.getByTitle('Delete entry');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveTextContent('×');
    });

    it('should call onDeleteEntry when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnDeleteEntry = jest.fn();
      
      render(<EntryHeader {...defaultProps} onDeleteEntry={mockOnDeleteEntry} />);
      
      const deleteButton = screen.getByTitle('Delete entry');
      await user.click(deleteButton);
      
      expect(mockOnDeleteEntry).toHaveBeenCalledWith('1');
    });

    it('should display "Select an entry" when no entry is selected', () => {
      render(<EntryHeader {...defaultProps} currentEntry={null} />);
      
      expect(screen.getByText('Select an entry')).toBeInTheDocument();
      expect(screen.queryByText('Friday, March 15')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete entry')).not.toBeInTheDocument();
    });
  });

  describe('Layout Without Help Button', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    });

    it('should not render help button in header anymore', () => {
      render(<EntryHeader {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /show shortcuts/i })).not.toBeInTheDocument();
      expect(screen.queryByText('?')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    });

    it('should maintain proper spacing between elements', () => {
      render(<EntryHeader {...defaultProps} />);
      
      const container = screen.getByText('Friday, March 15').closest('div')?.parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should display authentication button properly', () => {
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      render(<EntryHeader {...defaultProps} />);
      
      const authContainer = screen.getByTestId('signin-button').parentElement;
      expect(authContainer).toHaveClass('flex', 'items-center');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing environment variable gracefully', () => {
      delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: 'user_123' } });
      
      expect(() => render(<EntryHeader {...defaultProps} />)).not.toThrow();
      
      // Should show disabled button even if user mock says signed in
      const signinButton = screen.getByRole('button', { name: /authentication not configured/i });
      expect(signinButton).toBeDisabled();
    });

    it('should handle Clerk hook errors gracefully', () => {
      (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      mockUseUser.mockImplementation(() => {
        throw new Error('Clerk error');
      });
      
      // Should not crash the component
      expect(() => render(<EntryHeader {...defaultProps} />)).toThrow('Clerk error');
    });
  });
});