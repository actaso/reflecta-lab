# Tauri Migration Plan

## Overview

This document outlines the strategy for migrating the Reflecta web application to support both web and desktop platforms using a shared codebase architecture. The approach maximizes code reuse (99%+) while leveraging platform-specific capabilities.

## Current Architecture Analysis

**Existing Next.js Structure:**
- Next.js 15 with App Router and TypeScript
- TipTap rich text editor with custom extensions
- OpenAI API integration via Edge Runtime
- localStorage for data persistence
- TailwindCSS v4 for styling

**Tauri Compatibility Assessment:**
- ✅ **Compatible:** React components, TipTap editor, TailwindCSS, TypeScript
- ✅ **Adaptable:** localStorage → Tauri Store, API routes → Tauri commands
- ⚠️ **Needs Changes:** OpenAI API calls, Next.js routing, SSR features

## Shared Codebase Strategy

### Platform Abstraction Layer

Create a platform services interface to abstract differences between web and desktop:

```typescript
// packages/shared/src/services/platform.ts
export interface PlatformServices {
  storage: StorageService;
  ai: AIService;
  system: SystemService;
}

export interface StorageService {
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  loadEntries(): Promise<Record<string, JournalEntry[]> | null>;
}

export interface AIService {
  chatCompletion(messages: any[], mode: string, context: string): Promise<ReadableStream>;
}

export interface SystemService {
  openExternal(url: string): Promise<void>;
  showNotification(title: string, body: string): Promise<void>;
}
```

### Web Platform Implementation

```typescript
// packages/web/src/services/web/index.ts
export const webPlatformServices: PlatformServices = {
  storage: {
    async saveEntries(entries) {
      localStorage.setItem('journal-entries', JSON.stringify(entries));
    },
    async loadEntries() {
      const saved = localStorage.getItem('journal-entries');
      return saved ? JSON.parse(saved) : null;
    }
  },
  ai: {
    async chatCompletion(messages, mode, context) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, mode, context })
      });
      return response.body!;
    }
  },
  system: {
    async openExternal(url) { window.open(url, '_blank'); },
    async showNotification(title, body) { 
      new Notification(title, { body }); 
    }
  }
};
```

### Tauri Platform Implementation

```typescript
// packages/desktop/src/services/tauri/index.ts
import { invoke } from '@tauri-apps/api/tauri';

export const tauriPlatformServices: PlatformServices = {
  storage: {
    async saveEntries(entries) {
      await invoke('save_entries', { entries: JSON.stringify(entries) });
    },
    async loadEntries() {
      const result = await invoke('load_entries');
      return result ? JSON.parse(result as string) : null;
    }
  },
  ai: {
    async chatCompletion(messages, mode, context) {
      return await invoke('chat_completion', { messages, mode, context });
    }
  },
  system: {
    async openExternal(url) { await invoke('open_external', { url }); },
    async showNotification(title, body) { 
      await invoke('show_notification', { title, body }); 
    }
  }
};
```

## Monorepo Structure

```
reflecta/
├── packages/
│   ├── shared/                    # Shared React components & utilities
│   │   ├── src/
│   │   │   ├── components/        # All React components (Editor, Sidebar, etc.)
│   │   │   │   ├── Editor.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── AIChatSidebar.tsx
│   │   │   │   ├── JournalApp.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   │   ├── usePlatform.ts
│   │   │   │   └── useEntries.ts
│   │   │   ├── utils/             # Pure utility functions
│   │   │   │   └── formatters.ts
│   │   │   ├── types/             # TypeScript interfaces
│   │   │   │   └── index.ts
│   │   │   └── services/          # Platform abstraction interfaces
│   │   │       └── platform.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                       # Next.js web application
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   │   ├── api/
│   │   │   │   │   └── chat/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── globals.css
│   │   │   └── services/          # Web platform implementations
│   │   │       └── web/
│   │   │           └── index.ts
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   │
│   └── desktop/                   # Tauri desktop application
│       ├── src/
│       │   ├── main.tsx           # React entry point
│       │   ├── App.tsx           # Main app component
│       │   └── services/          # Tauri platform implementations
│       │       └── tauri/
│       │           └── index.ts
│       ├── src-tauri/             # Rust backend
│       │   ├── src/
│       │   │   ├── main.rs
│       │   │   ├── storage.rs
│       │   │   ├── ai.rs
│       │   │   └── system.rs
│       │   ├── Cargo.toml
│       │   └── tauri.conf.json
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # Root workspace config
├── turbo.json                     # Turborepo config
└── docs/
    └── TAURI_MIGRATION_PLAN.md   # This file
```

## Implementation Timeline

### Phase 1: Foundation Setup (Week 1)

**Day 1-2: Create Monorepo Structure**
```bash
# Initialize workspace
npm init -w packages/shared
npm init -w packages/web  
npm init -w packages/desktop

# Setup Turborepo
npm install -D turbo
```

**Day 3-4: Extract Shared Code**
```bash
# Move existing components to shared package
mkdir -p packages/shared/src
mv src/components packages/shared/src/
mv src/utils packages/shared/src/
mv src/types packages/shared/src/
```

**Day 5-7: Platform Services Layer**
- Create platform abstraction interfaces
- Implement web platform services
- Update shared components to use platform services

### Phase 2: Web App Migration (Week 2)

**Day 1-3: Refactor Web App**
- Move Next.js specific code to packages/web
- Update imports to use shared package
- Test web app functionality

**Day 4-5: Platform Provider Integration**
```typescript
// packages/shared/src/hooks/usePlatform.ts
import { createContext, useContext } from 'react';
import { PlatformServices } from '../services/platform';

const PlatformContext = createContext<PlatformServices | null>(null);

export const usePlatform = () => {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error('Platform not initialized');
  return platform;
};

export const PlatformProvider = ({ children, services }: {
  children: React.ReactNode;
  services: PlatformServices;
}) => (
  <PlatformContext.Provider value={services}>
    {children}
  </PlatformContext.Provider>
);
```

**Day 6-7: Update Main App Component**
```typescript
// packages/shared/src/components/JournalApp.tsx
import { usePlatform } from '../hooks/usePlatform';

export default function JournalApp() {
  const platform = usePlatform();
  
  // Replace localStorage calls with platform.storage
  useEffect(() => {
    platform.storage.loadEntries().then(setEntries);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      platform.storage.saveEntries(entries);
    }
  }, [entries, isLoaded]);

  // All other logic remains exactly the same!
}
```

### Phase 3: Tauri Desktop App (Week 3)

**Day 1-2: Initialize Tauri Project**
```bash
cd packages/desktop
npm create tauri-app@latest . --template react-ts
npm install
```

**Day 3-4: Rust Backend Commands**
```rust
// packages/desktop/src-tauri/src/main.rs
use tauri::Manager;

#[tauri::command]
async fn save_entries(entries: String) -> Result<String, String> {
    // Implement Tauri Store persistence
}

#[tauri::command]
async fn load_entries() -> Result<String, String> {
    // Implement Tauri Store loading
}

#[tauri::command]
async fn chat_completion(messages: String, mode: String, context: String) -> Result<String, String> {
    // Implement OpenAI API call with streaming
}
```

**Day 5-7: Frontend Integration**
```typescript
// packages/desktop/src/App.tsx
import { JournalApp } from '@reflecta/shared/components';
import { PlatformProvider } from '@reflecta/shared/hooks';
import { tauriPlatformServices } from './services/tauri';

export default function App() {
  return (
    <PlatformProvider services={tauriPlatformServices}>
      <JournalApp />
    </PlatformProvider>
  );
}
```

### Phase 4: macOS Integration (Week 4)

**Day 1-3: Native Features**
- Custom app icon and branding
- macOS menu bar integration
- System notifications for reminders

**Day 4-5: Advanced Integration**
- Spotlight search integration
- Share extension support
- iCloud Drive backup option

**Day 6-7: Performance Optimization**
- Bundle size optimization
- Native scrolling improvements
- Memory usage optimization

### Phase 5: Testing & Distribution (Week 5)

**Day 1-3: Testing**
- Port existing Jest tests to shared package
- Add Tauri-specific integration tests
- Performance testing

**Day 4-5: Distribution Setup**
- Code signing for macOS
- Notarization setup
- Auto-updater configuration

**Day 6-7: Documentation & Final Testing**
- Update documentation
- End-to-end testing
- Release preparation

## Key Implementation Details

### Platform Context Usage

```typescript
// In any shared component
import { usePlatform } from '../hooks/usePlatform';

function MyComponent() {
  const platform = usePlatform();
  
  const handleSave = async () => {
    await platform.storage.saveEntries(entries);
  };
  
  const handleAIChat = async () => {
    const stream = await platform.ai.chatCompletion(messages, mode, context);
    // Handle streaming response
  };
}
```

### Workspace Configuration

```json
// package.json (root)
{
  "name": "reflecta-workspace",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:web": "turbo run dev --filter=web",
    "dev:desktop": "turbo run dev --filter=desktop",  
    "build:web": "turbo run build --filter=web",
    "build:desktop": "turbo run build --filter=desktop",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "src-tauri/target/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

## Platform Differences

| Feature | Web | Desktop |
|---------|-----|---------|
| **Storage** | localStorage | Tauri Store |
| **AI API** | Next.js Route Handler | Rust Command |
| **External Links** | window.open | shell::open |
| **Notifications** | Web Notification API | System Notifications |
| **File System** | File API (limited) | Full file system access |
| **Build Output** | Static files | .app/.exe bundle |
| **Distribution** | Web hosting | App stores / Direct download |
| **Updates** | Automatic (web) | Auto-updater (Tauri) |
| **Offline** | Service Worker | Native offline |

## Benefits

### Development Benefits
- **99% Code Sharing**: Only platform services differ
- **Type Safety**: Shared TypeScript interfaces ensure consistency  
- **Single Source**: Components, hooks, and utilities shared between platforms
- **Easy Testing**: Test shared components once, works everywhere
- **Rapid Development**: Features added to both platforms simultaneously

### User Benefits
- **Performance**: 10x smaller bundle size, faster startup (desktop)
- **Native Feel**: True native macOS integration
- **Security**: Sandboxed environment with granular permissions
- **Offline**: Full offline functionality (desktop)
- **Accessibility**: Both web and native accessibility features

### Business Benefits
- **Reduced Maintenance**: Single codebase to maintain
- **Faster Releases**: Deploy to both platforms simultaneously
- **Consistent UX**: Identical experience across platforms
- **Cost Effective**: No need for separate development teams

## Risk Mitigation

### Technical Risks
- **Complexity**: Mitigated by clear platform abstraction
- **Performance**: Isolated to platform-specific implementations
- **Dependencies**: Shared dependencies carefully managed

### Migration Risks
- **Data Loss**: Comprehensive backup and migration scripts
- **User Experience**: Gradual rollout with feature flags
- **Rollback Plan**: Keep existing web app deployable during migration

## Success Metrics

- **Code Sharing**: >95% code shared between platforms
- **Performance**: Desktop app starts in <2 seconds
- **Bundle Size**: Desktop app <50MB
- **Test Coverage**: Maintain >80% coverage
- **User Satisfaction**: No regression in user experience

## Future Considerations

- **Mobile Apps**: React Native with same shared components
- **Additional Platforms**: Linux/Windows support via Tauri
- **Plugin System**: Extensible architecture for community plugins
- **Sync Service**: Cross-platform data synchronization

---

This migration plan provides a comprehensive roadmap for creating a shared codebase that supports both web and desktop platforms while maintaining the existing functionality and user experience of Reflecta.