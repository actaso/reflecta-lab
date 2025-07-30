import { readFileSync } from 'fs';
import { join } from 'path';

export type PromptType = 'initial-life-deep-dive' | 'default-session';

/**
 * Prototype Coaching Prompt Loader
 * Loads the appropriate coaching prompt based on session type
 */
export class PrototypeCoachingPromptLoader {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/lib/coaching/models/prototypeCoaching/prompts');

  /**
   * Load a specific prompt file
   */
  private static loadPromptFile(filename: string): string {
    try {
      const filePath = join(PrototypeCoachingPromptLoader.PROMPTS_DIR, filename);
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading prompt file ${filename}:`, error);
      throw new Error(`Failed to load prompt file: ${filename}`);
    }
  }

  /**
   * Get the system prompt based on session type
   */
  static getSystemPrompt(promptType: PromptType = 'default-session'): string {
    const filename = `${promptType}.md`;
    return PrototypeCoachingPromptLoader.loadPromptFile(filename);
  }

  /**
   * Determine which prompt to use based on user context
   * For now, always returns 'default-session' but can be extended with logic
   */
  static determinePromptType(
    userId: string,
    sessionCount?: number,
    isFirstSession?: boolean
  ): PromptType {
    // Future logic could go here to determine prompt type
    // For example:
    // if (isFirstSession || sessionCount === 0) {
    //   return 'initial-life-deep-dive';
    // }
    
    return 'default-session';
  }
} 