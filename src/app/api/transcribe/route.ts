import { NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI();

// Configuration constants
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI's limit)
const ALLOWED_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/m4a',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
];

// Helper function to get proper filename with extension
function getProperFilename(originalName: string, mimeType: string): string {
  // If filename already has extension, use it
  if (originalName && originalName.includes('.') && originalName !== 'blob') {
    return originalName;
  }
  
  // Generate filename with proper extension based on MIME type
  const timestamp = Date.now();
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/mpga': 'mp3',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
  };
  
  const extension = extensions[mimeType] || 'webm';
  return `audio_${timestamp}.${extension}`;
}

export async function POST(request: Request) {
  try {
    // Get the audio blob from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    // Validate file presence
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { 
          error: `Unsupported file type: ${audioFile.type}. Supported types: ${ALLOWED_TYPES.join(', ')}` 
        },
        { status: 415 }
      );
    }

    console.log(`[TRANSCRIBE] Processing file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Convert File to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Get proper filename with extension
    const properFilename = getProperFilename(audioFile.name, audioFile.type);
    console.log(`[TRANSCRIBE] Using filename: ${properFilename}`);
    
    // Create file object with proper metadata for OpenAI
    const file = await toFile(buffer, properFilename, { 
      type: audioFile.type,
      // Add additional metadata to help OpenAI identify the format
      lastModified: Date.now()
    });
    
    console.log(`[TRANSCRIBE] File object created - name: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Call OpenAI API with the file object
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      // Add language hint if needed (optional)
      // language: 'en',
    });

    console.log(`[TRANSCRIBE] Success: ${transcription.text.length} characters transcribed`);
    
    return NextResponse.json({ 
      success: true,
      text: transcription.text 
    });

  } catch (error) {
    console.error('[TRANSCRIBE] Error:', error);

    // Handle specific OpenAI API errors
    if (error instanceof Error) {
      // Check for common OpenAI API errors
      if (error.message.includes('Invalid file format') || error.message.includes('Unrecognized file format')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Audio format not supported by the transcription service. Please try recording in a different format (MP3, WAV, or M4A work best).',
            suggestion: 'Consider using a different recording method or converting the audio file format.' 
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Rate limit exceeded. Please try again later.' 
          },
          { status: 429 }
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'API configuration error' 
          },
          { status: 500 }
        );
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Request timeout. Please try with a shorter audio file.' 
          },
          { status: 408 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false,
        error: 'Transcription service temporarily unavailable. Please try again.' 
      },
      { status: 500 }
    );
  }
} 