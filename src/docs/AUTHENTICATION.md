# Authentication Documentation

## Overview

Reflecta Labs implements optional authentication using [Clerk](https://clerk.dev), providing users the choice to sign in for enhanced features while maintaining full functionality for anonymous users.

## Architecture

### Optional Authentication Design
- **Anonymous usage**: All core functionality works without signing in
- **Data persistence**: localStorage remains the primary data storage for all users
- **Optional signin**: Users can sign in for future sync capabilities and personalized features
- **Graceful fallbacks**: App functions normally when Clerk is not configured

### Authentication States

1. **No Clerk Configuration**: 
   - Signin button is disabled with visual indication
   - All journal functionality works normally
   - Data stored only in localStorage

2. **Clerk Configured + Not Signed In**:
   - Active signin button opens Clerk modal
   - All journal functionality works normally
   - Data stored only in localStorage

3. **Clerk Configured + Signed In**:
   - UserButton displays user avatar and menu
   - All journal functionality works normally
   - Data stored in localStorage (sync features can be added later)

## Implementation Details

### Environment Variables
Required for Clerk integration:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### Component Structure

#### ClerkProvider Integration (`layout.tsx`)
```typescript
// Conditional ClerkProvider wrapping based on environment
const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (hasClerkKeys) {
  return <ClerkProvider>{content}</ClerkProvider>;
}
return content;
```

#### Authentication UI (`EntryHeader.tsx`)
```typescript
const { isSignedIn, user } = useUser();

// Conditional rendering:
// 1. Not configured: disabled button
// 2. Configured + not signed in: SignInButton with modal
// 3. Configured + signed in: UserButton with avatar
```

### Key Features

#### SignIn Flow
- **Modal-based**: Uses Clerk's modal mode for seamless UX
- **No page redirects**: Keeps users in their journal context
- **Styled integration**: Custom button styling matching app design

#### UserButton Features
- **Custom styling**: Matches app's design system
- **Dark mode support**: Proper theming for dark/light modes
- **Compact design**: 32px avatar fits header layout

## Data Strategy

### Current Implementation
- **Primary storage**: localStorage for all users
- **No auth-gated features**: All functionality available to anonymous users
- **Future-ready**: Architecture supports adding sync features later

### Future Enhancements (Not Yet Implemented)
- Cloud sync of journal entries
- Cross-device access
- Backup and restore
- Sharing capabilities

## Testing Strategy

### Authentication States Testing
```typescript
// Test all three states:
1. No Clerk config (disabled button)
2. Clerk config + not signed in (active signin)
3. Clerk config + signed in (user button)
```

### Data Persistence Testing
```typescript
// Verify localStorage works in all auth states
- Anonymous users can create/edit/delete entries
- Signed-in users maintain localStorage functionality
- No data loss during signin/signout
```

## User Experience

### Authentication Flow
1. User clicks "signin" button
2. Clerk modal opens with signin/signup options
3. User completes authentication
4. Modal closes, UserButton appears
5. Journal remains exactly as it was (no data changes)

### Signout Flow
1. User clicks UserButton
2. Dropdown menu appears
3. User clicks "Sign out"
4. Returns to anonymous state
5. Journal data remains unchanged in localStorage

## Development Guidelines

### Environment Setup
```bash
# Pull latest environment variables from Vercel
npm run pull-env

# Verify Clerk configuration
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

### Testing Authentication
```bash
# Run authentication tests
npm test src/components/__tests__/EntryHeader.test.tsx

# Run full test suite
npm run test:ci
```

### Error Handling
- **Missing env vars**: App degrades gracefully to anonymous mode
- **Clerk service issues**: Signin disabled, app remains functional
- **Network issues**: localStorage ensures data persistence

## Security Considerations

### Client-Side Security
- **Public keys only**: Only publishable key exposed to client
- **No sensitive data**: localStorage contains no auth tokens
- **Optional authentication**: No forced user tracking

### Data Privacy
- **User choice**: Authentication is completely optional
- **Local-first**: Data primarily stored locally
- **No tracking**: Anonymous users leave no server traces

## Troubleshooting

### Common Issues

#### Signin Button Not Working
1. Check environment variables are set
2. Verify Clerk publishable key format
3. Check browser console for errors

#### Modal Not Appearing
1. Ensure ClerkProvider is properly wrapped
2. Check for JavaScript errors
3. Verify Clerk SDK version compatibility

#### Styling Issues
1. Check Clerk appearance customization
2. Verify dark mode CSS variables
3. Test responsive design on different screen sizes

### Debug Commands
```bash
# Check environment
npm run pull-env
cat .env.local | grep CLERK

# Test build
npm run build
npm run start

# Run tests
npm run test:ci
```