# Developer Onboarding Guide

Welcome to Reflecta Labs! This guide will help you quickly understand the codebase and start contributing effectively.

## 🏃‍♂️ Quick Setup (5 minutes)

### 1. Clone and Install
```bash
git clone <repository-url>
cd reflecta
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Configure required environment variables in .env.local:
# - OpenAI API key for AI chat functionality
# - Clerk keys for authentication (optional)
# - Firebase configuration for sync (optional)
# - PostHog keys for analytics (optional)
```

### 3. Start Development
```bash
# Start the development server
npm run dev

# Optional: Start Firebase emulators for full functionality
npm run firebase:emulator

# Open http://localhost:3000
```

### 4. Verify Setup
- Create a journal entry with `Cmd+Enter`
- Test search with `Cmd+K`
- Press `Shift` in the editor to trigger AI mode selector
- Select an AI mode and verify chat sidebar opens
- Test import/export in help modal (`?` button)

## 📚 Understanding the Codebase

### Core Concepts

**Reflecta Labs** is a founder-focused journaling app with AI-powered insights and comprehensive sync. Think of it as:
- **Notion-style editor** for rapid note-taking with markdown support
- **Apple Notes simplicity** with professional features and search
- **GitHub Copilot approach** to AI assistance (contextual, on-demand)
- **Firebase backend** for seamless cross-device synchronization
- **PostHog analytics** for user behavior insights

### Architecture Overview

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Entry Sidebar │  Journal Editor │   AI Chat       │
│                 │                 │                 │
│  📋 Navigation  │  ✍️  TipTap     │  🤖 OpenAI      │
│  📅 Dates       │  🏷️  Tags       │  💬 Streaming   │
│  🔍 Scroll      │  ⌨️  Shortcuts  │  🎯 3 Modes     │
│  🔍 Search      │  📤 Import/Export│  🔄 Firebase    │
│  ☁️  Sync       │  📊 Analytics   │  👤 Auth        │
└─────────────────┴─────────────────┴─────────────────┘
```

### Key Components Map

```
src/app/page.tsx                    # 🏠 Main app container with sync
├── components/Sidebar.tsx          # 📋 Left: Entry navigation with scroll-hijacking
├── components/Editor.tsx           # ✍️  Center: TipTap editor with AI integration
├── components/CommandPalette.tsx   # 🔍 Search overlay (Cmd+K)
├── components/HelpModal.tsx        # ❓ Help modal with import/export
├── components/MorningGuidanceCard.tsx # 🌅 Daily guidance prompts
├── components/AIChatSidebar.tsx    # 🤖 Right: AI chat sidebar
│   ├── ChatInterface.tsx           # 💬 Message management
│   ├── ChatMessage.tsx             # 💭 Individual message bubbles
│   └── ChatInput.tsx               # ⌨️  Auto-resizing input field
├── components/AIDropdown.tsx       # 🎯 Three-mode AI selector
├── hooks/useJournal.ts             # 🔄 Complete data management with sync
├── hooks/useFirebaseAuth.ts        # 👤 Clerk + Firebase auth bridge
├── hooks/useAnalytics.ts           # 📊 PostHog analytics integration
├── services/syncService.ts         # ☁️  Advanced localStorage-Firestore sync
├── app/api/chat/route.ts           # 🔗 OpenAI streaming API
└── app/api/auth/firebase-token/route.ts # 🔑 Token exchange endpoint
```

## 🔍 Code Patterns

### 1. Component Structure
All components follow this pattern:
```typescript
'use client';                       // Client component marker

import { useState, useEffect } from 'react';  // React hooks
import { SomeType } from './types'; // Local types

interface ComponentProps {          // Props interface
  required: string;
  optional?: boolean;
}

export default function Component({ required, optional = false }: ComponentProps) {
  const [state, setState] = useState('');  // Local state
  
  useEffect(() => {                 // Side effects
    // Effect logic
  }, [dependencies]);
  
  const handleEvent = () => {       // Event handlers
    // Handler logic  
  };
  
  return (                          // JSX return
    <div className="tailwind-classes">
      {/* Component content */}
    </div>
  );
}
```

### 2. Styling Conventions
```typescript
// ✅ Good: Descriptive, consistent
className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800"

// ❌ Avoid: Custom CSS, inline styles
style={{ backgroundColor: '#fff' }}
```

### 3. State Management
```typescript
// ✅ Local state for component-specific data
const [isOpen, setIsOpen] = useState(false);

// ✅ Props for parent-child communication  
interface Props {
  onClose: () => void;
  data: SomeType;
}

// ✅ Context extraction pattern (see page.tsx)
const getChatContext = () => {
  // Extract and format data
  return formattedContext;
};
```

## 🎯 Key Features Deep Dive

### 1. Journal Editor (Editor.tsx)
**What it does**: Rich text editing with TipTap
**Key features**:
- Shift key detection for AI dropdown
- Auto-tag highlighting (`word:` patterns)
- Real-time saving to localStorage

**Code to understand**:
```typescript
// Cursor position for dropdown placement
const getCursorPosition = useCallback(() => {
  const coords = view.coordsAtPos(from);
  return { x: coords.left, y: coords.bottom + 8 };
}, [editor]);

// Shift key handling
const handleKeyDown = (e: Event) => {
  const keyboardEvent = e as KeyboardEvent;
  if (keyboardEvent.key === 'Shift' && !keyboardEvent.repeat) {
    // Toggle dropdown
  }
};
```

### 2. AI Chat System
**What it does**: Context-aware AI assistance for founders
**Key features**:
- 3 specialized thinking modes
- Streaming responses via Vercel AI SDK
- Automatic context injection

**Code to understand**:
```typescript
// API route structure (app/api/chat/route.ts)
const getModePrompt = (mode: string, context: string) => {
  // Return mode-specific system prompt with context
};

// Chat hook usage (ChatInterface.tsx)
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { mode, context }
});
```

### 3. Navigation System (Sidebar.tsx)
**What it does**: Scroll-hijacking entry selection
**Key features**:
- Auto-select entries based on scroll position
- Smooth scrolling animations
- Date-based organization

**Code to understand**:
```typescript
// Scroll-hijacking logic
const handleScroll = () => {
  const triggerPoint = sidebarRect.top + sidebarRect.height / 3;
  // Find closest entry to trigger point
  // Auto-select that entry
};
```

## 🧪 Testing Approach

### Test Structure
```
src/
├── __tests__/                      # Integration tests
├── components/__tests__/           # Component tests  
└── utils/__tests__/                # Unit tests
```

### Writing Tests
```typescript
// Component test example
describe('ChatInput', () => {
  it('should auto-focus when autoFocus prop is true', () => {
    render(<ChatInput autoFocus={true} {...otherProps} />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});

// Integration test example  
describe('AI Chat Flow', () => {
  it('should open sidebar when AI mode selected', async () => {
    // Test full user flow
  });
});
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Development mode
npm run test:ci       # CI with coverage
```

## 🚀 Common Development Tasks

### Adding a New AI Mode

1. **Update the modes array** (AIDropdown.tsx):
```typescript
const aiModes = [
  // ... existing modes
  {
    id: 'new-mode',
    label: 'New Mode',
    description: 'Description of new mode'
  }
];
```

2. **Add system prompt** (app/api/chat/route.ts):
```typescript
const basePrompts = {
  // ... existing prompts
  'new-mode': `You are a [role]. The founder has shared...`
};
```

3. **Update TypeScript types** (AIDropdown.tsx):
```typescript
export type AIMode = 'dive-deeper' | 'reflect-back' | 'scrutinize-thinking' | 'new-mode';
```

### Adding a New Component

1. **Create component file**:
```typescript
// src/components/NewComponent.tsx
'use client';

interface NewComponentProps {
  // Define props
}

export default function NewComponent({ }: NewComponentProps) {
  return <div>New component</div>;
}
```

2. **Add tests**:
```typescript
// src/components/__tests__/NewComponent.test.tsx
import { render, screen } from '@testing-library/react';
import NewComponent from '../NewComponent';

describe('NewComponent', () => {
  it('should render correctly', () => {
    render(<NewComponent />);
    // Add assertions
  });
});
```

3. **Import and use**:
```typescript
import NewComponent from '../components/NewComponent';
```

### Debugging AI Responses

1. **Check API route logs**:
```typescript
// Add logging in app/api/chat/route.ts
console.log('Received:', { messages, mode, context });
```

2. **Test system prompts**:
```typescript
// Temporarily log the full prompt
console.log('System prompt:', getModePrompt(mode, context));
```

3. **Verify API key**:
```bash
# Check environment variable
echo $OPENAI_API_KEY
```

## 🔧 Development Best Practices

### 1. Code Quality
- **Always run tests** before committing: `npm run test:ci`
- **Lint your code**: `npm run lint`
- **TypeScript strict**: No `any` types, proper interfaces
- **Component isolation**: Each component should work independently

### 2. Performance
- **Use useCallback** for expensive functions
- **Memoize context extraction** when possible
- **Clean up event listeners** in useEffect cleanup
- **Optimize re-renders** with proper dependencies

### 3. Accessibility
- **Keyboard navigation**: All features accessible via keyboard
- **Screen reader support**: Proper ARIA labels
- **Focus management**: Logical tab order
- **Color contrast**: Meet WCAG guidelines

### 4. Error Handling
```typescript
// API errors
try {
  const result = await streamText({ /* ... */ });
  return result.toDataStreamResponse();
} catch (error) {
  console.error('Chat API error:', error);
  return new Response('Internal server error', { status: 500 });
}

// Component errors
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData().catch(err => {
    setError('Failed to load data');
    console.error(err);
  });
}, []);
```

## 📖 Learning Resources

### Understanding the Stack
- **Next.js 15**: [App Router documentation](https://nextjs.org/docs)
- **TipTap**: [Editor framework docs](https://tiptap.dev/)
- **Vercel AI SDK**: [AI integration guide](https://sdk.vercel.ai/)
- **TailwindCSS**: [Utility-first CSS](https://tailwindcss.com/)

### Project-Specific Knowledge
- **Journal UX patterns**: Study existing note-taking apps (Notion, Apple Notes)
- **Founder psychology**: Understanding the target user (YC resources)
- **AI interaction design**: Best practices for human-AI collaboration

## 🆘 Getting Help

### 1. Documentation First
- Check this guide
- Read component-specific docs in code comments
- Review [AI_CHAT_SIDEBAR.md](./AI_CHAT_SIDEBAR.md) for deep dive

### 2. Code Exploration
- Use IDE "Go to Definition" for understanding imports
- Search codebase for similar patterns
- Check git history for context on changes

### 3. Common Issues & Solutions

**"Cannot resolve module"**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"TypeScript errors"**:
- Check imports are correct
- Verify interface definitions
- Use TypeScript language server in IDE

**"Tests failing"**:
- Run specific test: `npm test -- --testNamePattern="MyTest"`
- Check for async/await issues
- Verify mock implementations

### 4. Team Communication
- Ask specific questions with code context
- Share error messages and steps to reproduce
- Propose solutions, not just problems

## 🎉 You're Ready!

You now have everything needed to contribute effectively to Reflecta Labs. Remember:

1. **Start small**: Pick up simple tasks first
2. **Test thoroughly**: Our users are busy founders who need reliability
3. **Think like a founder**: Every feature should solve real entrepreneurial problems
4. **Keep it simple**: Complexity is the enemy of great UX

Happy coding! 🚀