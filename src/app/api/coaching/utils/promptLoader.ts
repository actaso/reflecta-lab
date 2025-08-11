import { readFileSync } from 'fs';
import { join } from 'path';

export type PromptType = 'initial-life-deep-dive' | 'default-session';
export type InsightPromptType = 'insight-extraction';

/**
 * Coaching Prompt Loader
 * Loads the appropriate coaching prompt based on session type
 * Moved from lib to be closer to the routes that use it
 */
export class CoachingPromptLoader {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/app/api/coaching/chat/prompts');
  private static readonly INSIGHT_PROMPTS_DIR = join(process.cwd(), 'src/app/api/coaching/insightExtractor/prompts');

  /**
   * Load a specific prompt file from a given directory
   */
  private static loadPromptFile(filename: string, directory: string = CoachingPromptLoader.PROMPTS_DIR): string {
    try {
      const filePath = join(directory, filename);
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
    return CoachingPromptLoader.loadPromptFile(filename);
  }

  /**
   * Get the insight extraction prompt
   */
  static getInsightExtractionPrompt(promptType: InsightPromptType = 'insight-extraction'): string {
    const filename = `${promptType}.md`;
    return CoachingPromptLoader.loadPromptFile(filename, CoachingPromptLoader.INSIGHT_PROMPTS_DIR);
  }

  /**
   * Determine which prompt to use based on user context
   * For now, always returns 'default-session' but can be extended with logic
   */
  static determinePromptType(): PromptType {
    // Future logic could go here to determine prompt type
    // For example:
    // if (isFirstSession || sessionCount === 0) {
    //   return 'initial-life-deep-dive';
    // }
    
    return 'default-session';
  }
}