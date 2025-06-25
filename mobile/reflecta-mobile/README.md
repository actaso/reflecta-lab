# Reflecta Mobile

A React Native/Expo implementation of the Reflecta journal app for iOS.

## Overview

This mobile version replicates the core timeline UI and editor functionality from the web app:

- **Timeline View**: Left sidebar showing chronological entries with visual indicators
- **Rich Text Editor**: Basic text editor with auto-focus and real-time saving
- **Data Persistence**: Local storage using AsyncStorage
- **Entry Management**: Create, select, and edit journal entries

## Features Included

- ✅ Entry creation and selection
- ✅ Timeline sidebar with date organization  
- ✅ Basic text editor with auto-focus
- ✅ Real-time content saving
- ✅ Local data persistence
- ✅ Chronological entry ordering
- ✅ Word count-based entry indicators

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator or physical iPhone

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd mobile/reflecta-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on iOS:
   ```bash
   npm run ios
   ```

### Project Structure

```
src/
├── components/
│   ├── Timeline.tsx      # Entry timeline sidebar
│   └── Editor.tsx        # Text editor component
├── types/
│   └── index.ts          # TypeScript interfaces
└── utils/
    ├── storage.ts        # AsyncStorage utilities
    └── formatters.ts     # Text formatting helpers
```

## Architecture

- **Data Structure**: Same as web app (entries organized by date keys)
- **State Management**: React hooks with local state
- **Persistence**: AsyncStorage with JSON serialization
- **Navigation**: Touch-based entry selection

## Development Notes

- Layout uses 35% width for timeline, 65% for editor
- Entry indicators scale with word count (similar to web version)
- Auto-saves content on every keystroke
- Preserves entry chronological ordering

## Future Enhancements

- Rich text editing with tag highlighting
- Swipe gestures for navigation
- Pull-to-refresh for entry creation
- Enhanced mobile-specific interactions