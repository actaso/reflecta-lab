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

**Reflecta Labs** is a minimalist journal interface designed for rapid reflection and note-taking. The application provides a seamless, Apple Notes-inspired experience with advanced features like scroll-hijacking navigation, tag highlighting, and markdown support.

## Architecture

This is a Next.js 15 application using the App Router with TypeScript and TailwindCSS v4. Key characteristics:

- **Framework**: Next.js 15 with App Router architecture
- **Styling**: TailwindCSS v4 with PostCSS
- **Rich Text**: TipTap editor with markdown support and custom extensions
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

### User Interactions
- **Keyboard shortcuts**:
  - `Cmd+Enter`: Create new entry
  - `Cmd+Up/Down`: Navigate between entries
- **Mouse interactions**: Click entries to select, hover to show delete buttons
- **Help system**: `?` button with comprehensive usage documentation

### Data Management
- **localStorage persistence**: Automatic saving/loading of journal entries
- **Real-time updates**: Changes saved immediately as user types
- **Delete functionality**: Remove entries with confirmation through hover UI

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── page.tsx            # Main journal application component
│   └── globals.css         # Global styles and TipTap customizations
└── components/
    ├── Editor.tsx          # TipTap editor wrapper component
    ├── AutoTagExtension.ts # Custom TipTap extension for tag highlighting
    └── TagExtension.ts     # TipTap mark extension (utility)
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

### Data Structure
```typescript
type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string; // HTML from TipTap editor
};

// Organized by date keys (YYYY-MM-DD format)
entries: Record<string, JournalEntry[]>
```

## Dependencies

- **@tiptap/react**: Rich text editor framework
- **@tiptap/starter-kit**: Basic TipTap extensions
- **@tiptap/extension-placeholder**: Placeholder text support
- **next**: React framework
- **react**: UI library
- **tailwindcss**: Utility-first CSS framework

## Development Notes

- **Build process**: Always run `npm run lint` before building
- **TypeScript**: Strict mode enabled, avoid `any` types
- **Performance**: Functions like `getAllEntriesChronological` are memoized with `useCallback`
- **Browser compatibility**: Uses modern features, scrollbar hiding works cross-browser