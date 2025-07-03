# 🧪 Testing Clerk + Firebase Integration

## Quick Test Setup (Easiest Way)

### 1. **Start Firebase Emulators**
```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Start the emulators (from the reflecta directory)
firebase emulators:start
```
This will start:
- Firestore emulator on port 8080
- Auth emulator on port 9099  
- Firebase UI on port 4000

### 2. **Set Up Environment Variables**
Create `.env.local` with minimal config for emulator testing:
```env
# Clerk (you probably already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Firebase Admin (for emulator, use demo project)
FIREBASE_PROJECT_ID=demo-reflecta
FIREBASE_CLIENT_EMAIL=test@demo-reflecta.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4f5X...\n-----END PRIVATE KEY-----"
```

**Note:** For emulator testing, you can use any dummy values for the Firebase admin credentials since emulators don't validate them.

### 3. **Start the Development Server**
```bash
npm run dev
```

### 4. **Test the Integration**
1. **Open your app** - You'll see a test panel in the top-left corner
2. **Sign in with Clerk** - Use the existing Clerk sign-in button
3. **Check the test panel** - It will show:
   - ✅ Clerk authentication status
   - ✅ Firebase authentication status  
   - 👤 User information from both systems
4. **Test Firestore write** - Enter text and click "Test Firestore Write"
5. **Verify success** - You should see entries appear in the panel

## What Each Status Means

### Authentication States:
- **Clerk: ✅ Signed In** - Clerk authentication working
- **Firebase: ✅ Signed In** - Token exchange successful
- **Both green** = 🎉 **Everything working!**

### Test Results:
- **✅ Success! Entry created with ID: xxx** - Firestore write successful
- **❌ Error messages** - Check console for details

## Troubleshooting

### Common Issues:

1. **Firebase: ❌ Not Signed In** (but Clerk is working)
   - Check browser console for token exchange errors
   - Verify API route is accessible at `/api/auth/firebase-token`

2. **"Failed to exchange token"**
   - Check that Clerk environment variables are correct
   - Ensure Firebase emulators are running

3. **Firestore permission errors**
   - Check that Firestore rules allow authenticated users
   - Verify user ID is being passed correctly

## Production Testing

For production testing (optional):
1. Set up a real Firebase project
2. Add real Firebase admin credentials to `.env.local`
3. Update Firestore rules for your project
4. Test with real Clerk users

## Clean Up

When done testing:
1. **Remove the test panel** from `src/app/page.tsx` (lines 452-455)
2. **Delete** `src/components/AuthTestPanel.tsx` if you don't need it
3. **Stop emulators** with Ctrl+C

---

**🚀 Ready to test!** The test panel will show you exactly what's working and what needs fixing.