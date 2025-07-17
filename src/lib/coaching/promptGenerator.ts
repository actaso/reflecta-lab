import { CoachingContext } from '@/types/coaching';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Coaching Prompt Generator
 * Generates AI prompts for coaching interactions based on user context
 * 
 * This contains the business logic for creating coaching prompts
 * specifically for founder coaching scenarios.
 */
export class CoachingPromptGenerator {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/lib/coaching/prompts');

  /**
   * Read prompt file content
   */
  private static readPromptFile(filename: string): string {
    try {
      const filePath = join(this.PROMPTS_DIR, filename);
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading prompt file ${filename}:`, error);
      throw new Error(`Failed to load prompt file: ${filename}`);
    }
  }

  /**
   * Role definition for the AI coach
   */
  static getRole(): string {
    return this.readPromptFile('role.md');
  }

  /**
   * Task definition for what the AI should do
   */
  static getTask(): string {
    return this.readPromptFile('task.md');
  }

  /**
   * Output format specification
   */
  static getOutput(): string {
    return this.readPromptFile('output.md');
  }

  /**
   * Behavior guidelines for the AI
   */
  static getBehavior(): string {
    return this.readPromptFile('behavior.md');
  }

  /**
   * Generate the complete system prompt by combining all parts
   */
  static generateSystemPrompt(): string {
    return [
      this.getRole(),
      '',
      this.getTask(),
      '',
      this.getOutput(),
      '',
      this.getBehavior()
    ].join('\n');
  }

  /**
   * Generate user context message
   */
  static generateContextMessage(context: CoachingContext): string {
    return `Please analyze the following context and provide coaching guidance:

Current Entry: ${context.entryContent}

User Alignment: ${context.userAlignment}

Recent Entries: 
${context.formattedRecentEntries}`;
  }
}