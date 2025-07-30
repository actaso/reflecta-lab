import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, getSupportedDurations } from '@/app/api/generate-meditation/meditationTemplates';
import { promises as fs } from 'fs';
import path from 'path';

interface GenerateMeditationRequest {
  firstName: string;
  duration: string;
}

interface GenerateMeditationResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  duration?: number;
  template?: string;
}

/**
 * POST /api/generate-meditation
 * 
 * Returns personalized meditation audio from existing files
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧘 Starting meditation generation...');

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body);

    console.log(`🎯 Generating ${validatedRequest.duration} meditation for ${validatedRequest.firstName}`);

    // Get meditation template (for validation and metadata)
    const template = getTemplate(validatedRequest.duration);
    if (!template) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported duration: ${validatedRequest.duration}. Supported durations: ${getSupportedDurations().join(', ')}` 
        },
        { status: 400 }
      );
    }

    // For now, return the existing 5-minute meditation file regardless of requested duration
    const audioFilePath = path.join(process.cwd(), 'public', 'audio', '5m_meditation.wav');
    
    try {
      const audioBuffer = await fs.readFile(audioFilePath);
      
      console.log(`✅ Serving existing meditation file: ${audioBuffer.length} bytes`);

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Content-Disposition': `attachment; filename="meditation-${validatedRequest.duration}-${validatedRequest.firstName.toLowerCase()}.wav"`
        }
      });

    } catch (fileError) {
      console.error('Failed to read meditation file:', fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Meditation audio file not found' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Meditation generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('validation') ? 400 : 500;

    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to generate meditation: ${errorMessage}` 
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/generate-meditation
 * 
 * Returns API documentation and supported durations
 */
export async function GET() {
  return NextResponse.json({
    name: 'Meditation Audio Generator',
    description: 'Serves personalized meditation audio files',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Get meditation audio file',
        parameters: {
          firstName: {
            type: 'string',
            required: true,
            description: 'The user\'s first name for personalization'
          },
          duration: {
            type: 'string',
            required: true,
            description: 'Meditation duration',
            allowedValues: getSupportedDurations()
          }
        },
        example: {
          request: { 
            firstName: 'Alice', 
            duration: '5m'
          },
          response: {
            success: true,
            audioUrl: '/api/generate-meditation',
            duration: 300,
            template: '5m'
          }
        }
      }
    },
    supportedDurations: getSupportedDurations(),
    audioFormat: 'audio/wav',
    processingNote: 'Currently serving existing 5-minute meditation file for all requests'
  });
}

// Request validation function
function validateRequest(body: unknown): GenerateMeditationRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { firstName, duration } = body as Record<string, unknown>;

  // Validate firstName
  if (!firstName || typeof firstName !== 'string') {
    throw new Error('firstName is required and must be a string');
  }

  if (firstName.trim().length === 0) {
    throw new Error('firstName cannot be empty');
  }

  if (firstName.trim().length > 50) {
    throw new Error('firstName must be 50 characters or less');
  }

  // Validate duration
  if (!duration || typeof duration !== 'string') {
    throw new Error('duration is required and must be a string');
  }

  const supportedDurations = getSupportedDurations();
  if (!supportedDurations.includes(duration)) {
    throw new Error(`duration must be one of: ${supportedDurations.join(', ')}`);
  }

  return {
    firstName: firstName.trim(),
    duration: duration
  };
}

// Note: Static audio files are now served directly from the file system 