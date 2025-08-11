import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Path to the meditation audio file in the public directory
    const audioPath = join(process.cwd(), 'public', 'audio', '5m_meditation.wav');
    
    // Read the audio file
    const audioBuffer = await readFile(audioPath);
    
    // Return the audio file with appropriate headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': 'inline; filename="5m_meditation.wav"',
      },
    });
    
  } catch (error) {
    console.error('[MEDITATION] Error serving meditation audio:', error);
    
    // Handle file not found
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json(
        { 
          error: 'Meditation audio file not found',
          success: false 
        },
        { status: 404 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Unable to serve meditation audio',
        success: false 
      },
      { status: 500 }
    );
  }
}