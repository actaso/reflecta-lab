import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';
import { createReadStream } from 'fs';

const openai = new OpenAI();

// Ensure temp directory exists
const TEMP_DIR = join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  try {
    // Get the audio blob from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    try {
      await mkdir(TEMP_DIR, { recursive: true });
    } catch (error) {
      console.log('Temp directory already exists or error creating:', error);
    }

    // Generate a unique filename
    const fileName = `${uuidv4()}.webm`;
    const filePath = join(TEMP_DIR, fileName);

    // Write the audio file to disk
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    try {
      // Call OpenAI API with proper file handling
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: "whisper-1", // Using whisper-1 as it's more widely available
      });

      return NextResponse.json({ 
        success: true,
        text: transcription.text 
      });

    } finally {
      // Cleanup: Delete the temporary file
      try {
        await unlink(filePath);
        console.log('Temporary file deleted:', filePath);
      } catch (error) {
        console.error('Error deleting temporary file:', error);
      }
    }

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during transcription'
      },
      { status: 500 }
    );
  }
} 