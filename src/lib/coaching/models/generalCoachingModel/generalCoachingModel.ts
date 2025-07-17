import { CoachingModel, CoachingContext, ModelInfo } from '@/types/coaching';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * General Coaching Model
 * The original coaching model for users with established journaling habits
 * Provides contextual reflection questions and actionable guidance for founders
 */
export class GeneralCoachingModel implements CoachingModel {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/lib/coaching/models/generalCoachingModel/prompts');

  getInfo(): ModelInfo {
    return {
      id: 'general-coaching',
      name: 'General Coaching',
      description: 'Contextual coaching for established journalers with reflection questions and actionable guidance',
      version: '1.0.0'
    };
  }

  canHandle(context: CoachingContext): boolean {
    // This model is suitable for users with journaling experience (after first entry)
    return context.entryCount >= 2;
  }

  /**
   * Read prompt file content
   */
  private readPromptFile(filename: string): string {
    try {
      const filePath = join(GeneralCoachingModel.PROMPTS_DIR, filename);
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading prompt file ${filename}:`, error);
      throw new Error(`Failed to load prompt file: ${filename}`);
    }
  }

  generateSystemPrompt(): string {
    const role = this.readPromptFile('role.md');
    const task = this.readPromptFile('task.md');
    const output = this.readPromptFile('output.md');
    const behavior = this.readPromptFile('behavior.md');

    return [
      role,
      '',
      task,
      '',
      output,
      '',
      behavior
    ].join('\n');
  }

  generateContextMessage(context: CoachingContext): string {
    return `Please analyze the following context and provide coaching guidance:

Current Entry: ${context.entryContent}

User Alignment: ${context.userAlignment}

Recent Entries: 
${context.formattedRecentEntries}`;
  }
} 