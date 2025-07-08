# Image Support in Reflecta Journal

This document explains how the image support feature works and how to troubleshoot common issues.

## How Image Support Works

The image support is implemented using the official TipTap Image extension with custom event handlers for paste and drag-and-drop operations. It integrates with Firebase Storage for cloud storage and the journal's sync system for metadata tracking.

**Key Components:**
- **TipTap Image Extension**: Official extension for rendering images
- **Custom Event Handlers**: Handle paste and drop events for image uploads
- **ImageService**: Manages Firebase Storage uploads and image processing
- **Journal Integration**: Tracks image metadata with journal entries

### Supported Image Operations

1. **Direct Image Paste**
   - Copy an image from anywhere (browser, screenshot, file manager)
   - Paste directly into the editor with `Cmd+V` / `Ctrl+V`
   - Image will be compressed, uploaded to Firebase Storage, and embedded

2. **Image URL Paste**
   - Copy a direct image URL (ending in .jpg, .png, .gif, .webp)
   - Paste into the editor
   - Image will be fetched, uploaded to Firebase Storage, and embedded

3. **Drag and Drop**
   - Drag image files from your file manager
   - Drop them directly into the editor
   - Files will be uploaded and embedded automatically

4. **Markdown Image Syntax**
   - Type `![alt text](image-url)` manually
   - Will be converted to embedded image if URL is valid

## Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **WebP** (.webp)

## Image Processing

- **Automatic Compression**: Images are compressed to 80% quality
- **Automatic Resizing**: Large images are resized to max 1920x1080 pixels
- **Size Limit**: Maximum file size is 5MB
- **Optimization**: Images are optimized for web display

## Firebase Storage Integration

Images are stored in Firebase Storage with the following structure:
```
images/{user-id}/{timestamp}_{random}.{extension}
```

Each image is associated with metadata stored in the journal entry:
- Filename in storage
- Download URL
- File size
- MIME type
- Upload timestamp

## Debug Information

When testing image uploads, open your browser's developer console to see debug logs:

- `🖼️ [IMAGE PASTE]` - Paste event handling
- `🖼️ [IMAGE DROP]` - Drag and drop handling
- `🖼️ [IMAGE DRAG]` - Drag events (dragover, dragenter, etc.)
- `🖼️ [IMAGE UPLOAD]` - Upload process
- `🖼️ [URL EXTRACT]` - URL extraction from redirects

## Common Issues and Troubleshooting

### 1. Drag and Drop Not Working

**Symptoms**: Dragging images opens them in a new browser tab instead of uploading

**Debug Steps**:
1. Open browser console
2. Try dragging an image
3. Look for `🖼️ [IMAGE DRAG]` logs
4. Check if `Files` type is detected in dragover/dragenter

**Possible Causes**:
- Browser security restrictions
- Conflicting event handlers
- File type not recognized

### 2. Paste Not Working

**Symptoms**: Pasting images doesn't embed them in the editor

**Debug Steps**:
1. Open browser console
2. Try pasting an image
3. Look for `🖼️ [IMAGE PASTE]` logs
4. Check clipboard items and their types

**Possible Causes**:
- Clipboard doesn't contain image data
- Security restrictions on clipboard access
- Image format not supported

### 3. URL Paste Not Working

**Symptoms**: Pasting image URLs doesn't create embedded images

**Debug Steps**:
1. Open browser console
2. Paste the URL
3. Look for `🖼️ [IMAGE PASTE]` and `🖼️ [URL EXTRACT]` logs
4. Check if URL is recognized as image or redirect

**Common URL Types**:
- ✅ Direct image URLs: `https://example.com/image.jpg`
- ❌ Google Images redirects: Need URL extraction
- ❌ Social media image URLs: Often require authentication

### 4. Upload Failures

**Symptoms**: Images show "Upload failed" state

**Debug Steps**:
1. Check `🖼️ [IMAGE UPLOAD]` logs
2. Verify user authentication status
3. Check Firebase Storage emulator is running
4. Verify file size and format

**Possible Causes**:
- User not authenticated
- Firebase Storage not configured
- Network connectivity issues
- File too large or invalid format

## Firebase Emulator Setup

For local development, ensure Firebase Storage emulator is running:

```bash
# Start emulators (includes Storage on port 9199)
npm run dev:emulators

# Start development server
npm run dev
```

The storage emulator should be accessible at:
- Emulator UI: http://localhost:4000
- Storage emulator: http://localhost:9199

## Testing Checklist

Before reporting issues, test these scenarios:

- [ ] Copy/paste screenshot from system clipboard
- [ ] Copy/paste image from web browser
- [ ] Drag and drop image file from file manager
- [ ] Paste direct image URL (e.g., `https://picsum.photos/400/300.jpg`)
- [ ] Paste Google Images URL
- [ ] Check browser console for debug logs
- [ ] Verify Firebase emulator is running
- [ ] Test with different image formats (JPG, PNG, GIF, WebP)
- [ ] Test with different file sizes

## Implementation Details

The image support consists of:

1. **ImageService** (`src/services/imageService.ts`)
   - Handles file validation, compression, and Firebase Storage uploads
   - Supports both file uploads and URL-based uploads

2. **ImageExtension** (`src/components/ImageExtension.ts`)
   - Custom TipTap extension for handling paste, drop, and markdown events
   - Integrates with ImageService for upload operations

3. **Journal Integration** (`src/hooks/useJournal.ts`)
   - Tracks image metadata with journal entries
   - Syncs image references between localStorage and Firestore

4. **UI Components** (`src/components/Editor.tsx`)
   - Integrates ImageExtension with the main editor
   - Handles image metadata callbacks

The system is designed to be offline-first, with images uploaded when connectivity is available and metadata synced through the existing journal sync mechanism.