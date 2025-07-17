# Coaching Blocks Documentation

## Overview

The Coaching Blocks system provides AI-powered coaching prompts embedded directly within journal entries. This system delivers contextual reflection questions and actionable guidance designed specifically for entrepreneurs and founders.

## Architecture

### Core Components

#### 1. **CoachingBlockExtension.tsx**
- **Purpose**: Custom TipTap node extension for rendering coaching prompts
- **Location**: `src/components/CoachingBlockExtension.tsx`
- **Features**:
  - Two display variants: `text` and `buttons`
  - Sage icon integration with subtle animations
  - Markdown support for rich text rendering
  - Interactive button options with hover effects
  - Dark mode support
  - Custom TipTap commands for insertion

#### 2. **CoachingBlockDemo.tsx**
- **Purpose**: Demo interface for testing and development
- **Location**: `src/components/CoachingBlockDemo.tsx`
- **Features**:
  - Sample reflection prompts for founders
  - Button option examples
  - Integration testing with Editor component

#### 3. **Editor Integration**
- **File**: `src/components/Editor.tsx`
- **Integration Points**:
  - Extension registration in TipTap
  - Keyboard trigger (Space key at line start)
  - Exposed `insertCoachingBlock` method
  - Automatic variant selection (60% text, 40% buttons)

## Data Structure

```typescript
interface CoachingBlockData {
  content: string;           // The coaching prompt text
  variant: 'text' | 'buttons'; // Display variant
  options?: string[];        // Button options (for button variant)
}
```

## Display Variants

### Text Variant
- **Visual**: Sage icon + markdown-rendered content
- **Use Case**: Reflection questions, multi-paragraph prompts
- **Features**:
  - Full markdown support (bold, italic, lists)
  - Consistent typography with editor
  - Responsive design

### Button Variant
- **Visual**: Sage icon + question + horizontal button layout
- **Use Case**: Action-oriented choices, decision prompts
- **Features**:
  - Interactive buttons with selection states
  - Hover effects and animations
  - Staggered appearance animation
  - Responsive button wrapping

## User Interactions

### Insertion Methods

#### 1. **Keyboard Trigger**
- **Action**: Press Space at beginning of line
- **Behavior**: Inserts random coaching block
- **Variant Selection**: 60% text, 40% buttons (automatic)

#### 2. **Programmatic Insertion**
```typescript
// Via editor ref
editorRef.current?.insertCoachingBlock(content, variant, options);

// Via TipTap command
editor.chain()
  .focus()
  .insertCoachingBlock(content, variant, options)
  .run();
```

#### 3. **Demo Interface**
- **Text Prompt Button**: Inserts reflection question
- **Button Options Button**: Inserts actionable choices
- **Development Tool**: For testing and iteration

### Button Interactions
- **Click**: Selects option (visual feedback)
- **State**: Tracks selected option locally
- **Extensibility**: Ready for API integration and analytics

## Implementation Details

### TipTap Integration
- **Node Type**: Custom atomic block node
- **Rendering**: ReactNodeViewRenderer for React components
- **Serialization**: HTML with `data-coaching-block` attributes
- **Commands**: `insertCoachingBlock` command available globally

### Styling System
- **Framework**: Tailwind CSS with custom styling
- **Theme Support**: Light and dark mode compatible
- **Typography**: Geist Sans font family consistency
- **Animations**: Smooth hover effects and staggered appearances

### Content Management
Currently uses static arrays of sample prompts:

```typescript
const mockPrompts = [
  "What patterns do you notice in your recent decisions?",
  "Reflect on a recent challenge you faced...",
  // ... more prompts
];
```

## Current Limitations

### 1. **Static Content**
- Hardcoded prompt arrays
- No dynamic generation
- No personalization
- No context awareness

### 2. **Missing State Management**
- Button selections not persisted
- No analytics tracking
- No user preference storage
- No interaction history

### 3. **Limited Actions**
- Button clicks have placeholder handlers
- No API integration
- No follow-up actions
- No content insertion from selections

## Future Enhancements

### Phase 1: Dynamic Content
- **AI-Generated Prompts**: Replace static arrays with AI-generated content
- **Context Awareness**: Use journal entries for personalized prompts
- **User Alignment**: Integrate with existing alignment/goals system

### Phase 2: State Management
- **Persistence**: Save button selections and interactions
- **Analytics**: Track coaching effectiveness and usage patterns
- **Sync**: Integrate with existing sync service

### Phase 3: Advanced Features
- **Action Handlers**: Implement meaningful button actions
- **Content Generation**: Generate follow-up content based on selections
- **Learning Algorithm**: Adapt prompts based on user behavior
- **Progress Tracking**: Measure coaching effectiveness

## Integration Points

### Existing Systems
- **Morning Guidance**: Could share AI prompt generation
- **Analytics**: PostHog integration for interaction tracking
- **Sync Service**: Persist coaching interactions
- **Authentication**: User-specific coaching content

### Technical Dependencies
- **TipTap**: Rich text editor framework
- **React**: Component rendering
- **ReactMarkdown**: Text variant rendering
- **Tailwind**: Styling system

## Development Workflow

### Testing
```bash
# Run the demo component
npm run dev
# Navigate to coaching block demo page
```

### Adding New Prompts
1. **Static Addition**: Add to `mockPrompts` array in Editor.tsx
2. **Dynamic Generation**: Implement `CoachingContentService`
3. **API Integration**: Connect to AI prompt generation service

### Customizing Variants
1. **Modify Components**: Update rendering in CoachingBlockExtension
2. **Add Data Fields**: Extend CoachingBlockData interface
3. **Update Commands**: Modify insertCoachingBlock command

## Best Practices

### Content Guidelines
- **Founder-Focused**: Questions relevant to startup journey
- **Actionable**: Prompts that lead to concrete insights
- **Concise**: Clear, focused questions
- **Varied**: Mix of reflection and action prompts

### Technical Guidelines
- **Atomic Operations**: Keep coaching blocks as standalone units
- **Extensible Design**: Build for future feature expansion
- **Performance**: Lazy load content when possible
- **Accessibility**: Ensure keyboard navigation and screen reader support

## Troubleshooting

### Common Issues
1. **Coaching Block Not Appearing**: Check TipTap extension registration
2. **Styling Issues**: Verify Tailwind classes and dark mode support
3. **Button Not Responding**: Check event handlers and state management
4. **Content Not Rendering**: Verify ReactMarkdown component setup

### Debug Tips
- Use browser dev tools to inspect coaching block DOM structure
- Check console for TipTap command execution
- Verify React component lifecycle with React DevTools
- Test markdown rendering with complex content

## Performance Considerations

### Current Performance
- **Lightweight**: Minimal DOM overhead
- **Efficient**: React component rendering
- **Responsive**: Smooth animations and interactions

### Optimization Opportunities
- **Lazy Loading**: Load coaching content on demand
- **Memoization**: Cache rendered markdown content
- **Virtualization**: For large numbers of coaching blocks
- **Bundle Splitting**: Separate coaching system from core editor

## API Reference

### Commands
```typescript
// Insert coaching block
editor.chain()
  .insertCoachingBlock(content, variant?, options?)
  .run();
```

### Editor Methods
```typescript
interface EditorHandle {
  insertCoachingBlock: (
    content: string, 
    variant?: 'text' | 'buttons', 
    options?: string[]
  ) => void;
}
```

### Component Props
```typescript
interface CoachingBlockData {
  content: string;
  variant: 'text' | 'buttons';
  options?: string[];
}
```

## Conclusion

The Coaching Blocks system provides a solid foundation for AI-powered coaching within the journal interface. While currently using static content, the architecture is designed for scalability and future enhancements including dynamic content generation, state management, and advanced user interactions.

The system successfully integrates with the existing TipTap editor infrastructure and maintains consistency with the application's design language and technical patterns.