# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development:
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

The project uses npm as the package manager. All commands should be run from the `reflecta/` directory.

## Project Overview

**Reflecta Labs** is a minimalist journal interface designed for rapid reflection and note-taking. The application provides a seamless, Apple Notes-inspired experience with advanced features like scroll-hijacking navigation, tag highlighting, markdown support, and optional authentication.

## Architecture

This is a Next.js 15 application using the App Router with TypeScript and TailwindCSS v4. Key characteristics:

- **Framework**: Next.js 15 with App Router architecture
- **Styling**: TailwindCSS v4 with PostCSS
- **Rich Text**: TipTap editor with markdown support and custom extensions
- **AI Integration**: Vercel AI SDK with OpenAI GPT-4o-mini for founder-focused assistance
- **Authentication**: Optional Clerk integration for user management
- **Data Storage**: localStorage for client-side persistence
- **Fonts**: Geist Sans and Geist Mono from next/font/google
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → `./src/*`)

## Key Features

### Journal Interface
- **Multi-entry system**: Multiple entries per day with timestamps
- **Scroll-hijacking navigation**: Auto-selects entries based on scroll position in sidebar
- **Fixed scroll indicator**: Visual indicator at 1/3 height showing active selection zone
- **Date-based organization**: Entries organized by date in descending chronological order
- **Entry previews**: Single-line text previews with HTML stripped from content

### Editor Features
- **TipTap integration**: Rich text editing with markdown support
- **Tag highlighting**: Automatic highlighting of `word:` patterns at line start
- **Auto-focus**: Seamless entry creation with immediate cursor focus
- **Minimal design**: Clean interface without visual clutter
- **AI integration**: Shift key triggers AI mode selector for contextual assistance

### AI Chat Sidebar
- **Three thinking modes** designed specifically for founders:
  - **Dive Deeper**: Strategic exploration and opportunity identification
  - **Reflect Back**: Entrepreneurial journey insights and pattern recognition
  - **Scrutinize Thinking**: Business strategy validation and risk assessment
- **Context-aware responses**: Automatically injects journal entry content as context
- **Streaming chat**: Real-time responses using OpenAI GPT-4o-mini via Vercel AI SDK
- **VS Code-style interface**: Resizable sidebar (300-600px) with professional design
- **Auto-focus input**: Cursor automatically goes to chat input when sidebar opens

### Authentication System
- **Optional integration**: Clerk-based authentication with graceful fallbacks
- **Three states**: No config (disabled), not signed in (signin button), signed in (user avatar)
- **Modal signin**: Seamless authentication without page redirects
- **Local-first**: All functionality available to anonymous users
- **Future-ready**: Architecture supports sync features when needed

### User Interactions
- **Keyboard shortcuts**:
  - `Cmd+Enter`: Create new entry
  - `Cmd+Up/Down`: Navigate between entries
  - `Shift+Cmd`: Open AI mode selector (while in editor)
  - `ESC`: Close AI sidebar
  - `Enter`: Send chat message / Select dropdown option
  - `Shift+Enter`: New line in chat input
- **Mouse interactions**: Click entries to select, hover to show delete buttons
- **Help system**: Floating `?` button (bottom-right) with comprehensive usage documentation
- **Authentication**: Optional signin button (top-right) for enhanced features

### Data Management
- **localStorage persistence**: Automatic saving/loading of journal entries
- **Real-time updates**: Changes saved immediately as user types
- **Delete functionality**: Remove entries with confirmation through hover UI

## File Structure

```
src/
├── app/
│   ├── api/chat/
│   │   └── route.ts        # OpenAI API endpoint for streaming AI responses
│   ├── layout.tsx          # Root layout with fonts, metadata, and ClerkProvider
│   ├── page.tsx            # Main journal application component with floating help
│   └── globals.css         # Global styles and TipTap customizations
├── components/
│   ├── Editor.tsx          # TipTap editor wrapper with AI integration
│   ├── EntryHeader.tsx     # Header with auth UI and entry info
│   ├── AIChatSidebar.tsx   # Resizable VS Code-style AI chat sidebar
│   ├── ChatInterface.tsx   # Chat message management and state
│   ├── ChatMessage.tsx     # Individual message bubble component
│   ├── ChatInput.tsx       # Auto-resizing input with keyboard shortcuts
│   ├── AIDropdown.tsx      # Three-mode AI selector dropdown
│   ├── AutoTagExtension.ts # Custom TipTap extension for tag highlighting
│   └── TagExtension.ts     # TipTap mark extension (utility)
└── docs/
    ├── AI_CHAT_SIDEBAR.md     # Comprehensive AI feature documentation
    ├── AUTHENTICATION.md      # Authentication implementation guide
    └── DEVELOPER_ONBOARDING.md # Developer setup and patterns guide
```

## Key Implementation Details

### Scroll-Hijacking Logic
The sidebar implements scroll-hijacking by:
1. Tracking scroll position in a trigger zone (top 1/3 of sidebar)
2. Finding the entry closest to the trigger point
3. Auto-selecting that entry for seamless navigation
4. Using fixed spacers to enable proper scroll range

### Tag Highlighting System
- **Pattern**: `^([a-zA-Z0-9_-]+):` (word followed by colon at line start)
- **Implementation**: Custom TipTap extension using ProseMirror decorations
- **Styling**: Yellow background (`#fef3c7`) with brown text (`#92400e`)

### AI Chat System
The AI chat provides founder-focused assistance through:
1. **Context Extraction**: Automatically extracts plain text from current journal entry with timestamp
2. **Mode-Specific Prompts**: Three specialized system prompts tailored for founder needs
3. **Streaming Responses**: Real-time AI responses using Vercel AI SDK and OpenAI GPT-4o-mini
4. **VS Code-Style UI**: Resizable sidebar with professional chat interface

**AI Thinking Modes**:
- **Dive Deeper**: Strategic advisor helping explore opportunities and frameworks
- **Reflect Back**: Seasoned mentor providing entrepreneurial journey insights
- **Scrutinize Thinking**: Business strategist challenging assumptions and identifying risks

### Data Structure
```typescript
type JournalEntry = {
  id: string;
  timestamp: Date; // created at
  content: string; // HTML from TipTap editor
  uid: string; // user id from firebase auth & clerk (should be the same)
  lastUpdated: Date; // last time a change happened to this entry
};

// Organized by date keys (YYYY-MM-DD format)
entries: Record<string, JournalEntry[]>
```

## Dependencies

### Core Framework
- **next**: React framework
- **react**: UI library
- **tailwindcss**: Utility-first CSS framework

### Rich Text Editor
- **@tiptap/react**: Rich text editor framework
- **@tiptap/starter-kit**: Basic TipTap extensions
- **@tiptap/extension-placeholder**: Placeholder text support

### AI Integration
- **ai**: Vercel AI SDK for streaming responses and chat hooks
- **@ai-sdk/openai**: OpenAI provider for Vercel AI SDK
- **openai**: OpenAI API client library

### Authentication
- **@clerk/nextjs**: Optional authentication provider for user management

## Testing

### Test Framework
- **Jest**: Test runner with React Testing Library for component testing
- **Coverage requirement**: Maintain 80% code coverage minimum
- **Test structure**: Organized in `__tests__` directories and `.test.ts/.tsx` files

### Test Commands
```bash
npm test          # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci   # Run tests for CI (no watch, with coverage)
```

### Testing Guidelines

#### **CRITICAL: Always Test Before Pushing**
1. **Run tests before every push**: `npm run test:ci`
2. **Tests must pass**: Never push with failing tests
3. **Maintain coverage**: Keep above 80% code coverage

#### **Test-Driven Development**
1. **Write tests first** for complex features
2. **Add tests for new features** - Every new feature needs corresponding tests
3. **Update existing tests** when modifying functionality
4. **Test edge cases** and error conditions

#### **Test Categories**
1. **Unit Tests**: Utility functions (`src/utils/__tests__/`)
2. **Component Tests**: Individual components (`src/components/__tests__/`)
3. **Integration Tests**: User workflows (`src/__tests__/`)
4. **Critical Functionality**: Entry creation, navigation, persistence

#### **Core Test Coverage**
- ✅ **Entry Creation** (Cmd+Enter) - Must never break
- ✅ **Entry Navigation** (Cmd+Up/Down) - Must work without flashing
- ✅ **Data Persistence** - localStorage save/load
- ✅ **Content Editing** - Real-time saving
- ✅ **Scroll Hijacking** - Auto-selection while scrolling
- ✅ **Tag Highlighting** - Markdown-style `tag:` patterns
- ✅ **Utility Functions** - Date formatting, word counting, HTML stripping

#### **Test Patterns**
```typescript
// Unit test example
describe('formatDate', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2024-03-15T10:30:00Z');
    expect(formatDate(date)).toBe('2024-03-15');
  });
});

// Component test example
describe('Editor', () => {
  it('should call onChange when content updates', () => {
    const mockOnChange = jest.fn();
    render(<Editor content="test" onChange={mockOnChange} />);
    // Test implementation
  });
});
```

#### **Memory: Testing Workflow**
When making ANY changes to the codebase:
1. **Before coding**: Consider what tests need to be added/updated
2. **During coding**: Write tests alongside implementation
3. **Before committing**: Run `npm run test:ci` to ensure all tests pass
4. **Before pushing**: Double-check tests are passing and coverage is maintained

## Development Notes

- **Build process**: Always run `npm run lint` and `npm run test:ci` before building/pushing
- **TypeScript**: Strict mode enabled, avoid `any` types
- **Performance**: Functions like `getAllEntriesChronological` are memoized with `useCallback`
- **Browser compatibility**: Uses modern features, scrollbar hiding works cross-browser