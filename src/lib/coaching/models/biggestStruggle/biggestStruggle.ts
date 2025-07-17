import { CoachingModel, CoachingContext, ModelInfo } from '@/types/coaching';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Biggest Struggle Model
 * Specialized coaching model for new journalers (users with <2 entries)
 * Guides users through exploring and working with their biggest struggles
 */
export class BiggestStruggleModel implements CoachingModel {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/lib/coaching/models/biggestStruggle/prompts');

  getInfo(): ModelInfo {
    return {
      id: 'biggest-struggle',
      name: 'Biggest Struggle',
      description: 'Specialized coaching for exploring and working through biggest life struggles',
      version: '1.0.0'
    };
  }

  canHandle(context: CoachingContext): boolean {
    // This model is designed for users on their very first journal entry
    return context.entryCount === 1;
  }

  /**
   * Read prompt file content
   */
  private readPromptFile(filename: string): string {
    try {
      const filePath = join(BiggestStruggleModel.PROMPTS_DIR, filename);
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading Biggest Struggle prompt file ${filename}:`, error);
      throw new Error(`Failed to load Biggest Struggle prompt file: ${filename}`);
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
    // For new users, we want to focus on their current entry and basic context
    const entryCountText = context.entryCount === 1 ? 'This is their first journal entry' : `They have ${context.entryCount} total entries`;
    
    let contextMessage = `You're working with someone new to journaling. ${entryCountText}.

Current Entry: ${context.entryContent}`;

    // Add user alignment if available
    if (context.userAlignment && context.userAlignment !== "Not specified") {
      contextMessage += `\n\nTheir stated life priority: ${context.userAlignment}`;
    }

    // Add recent entries if they exist
    if (context.recentEntries.length > 0) {
      contextMessage += `\n\nPrevious entries for context:
${context.formattedRecentEntries}`;
    }

    contextMessage += `\n\nGuide them through exploring their biggest struggle. Help them understand what they're facing, why it matters, and how to begin working with it constructively.`;

    return contextMessage;
  }
} 