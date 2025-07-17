import { CoachingInteractionRequest } from '@/types/coaching';

/**
 * Route-specific validation for coaching interaction API
 * 
 * This validation is specific to the coaching-interaction route
 * and not intended for reuse across the application.
 */
export class CoachingInteractionValidator {
  /**
   * Validate coaching interaction request
   */
  static validateRequest(body: unknown): CoachingInteractionRequest {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    const bodyObj = body as Record<string, unknown>;

    if (!bodyObj.entryId || typeof bodyObj.entryId !== 'string') {
      throw new Error('Invalid or missing entryId');
    }

    if (bodyObj.entryContent === undefined || bodyObj.entryContent === null || typeof bodyObj.entryContent !== 'string') {
      throw new Error('Invalid or missing entryContent');
    }

    return {
      entryId: bodyObj.entryId,
      entryContent: bodyObj.entryContent
    };
  }
}