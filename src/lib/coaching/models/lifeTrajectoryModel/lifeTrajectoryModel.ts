import { CoachingModel, CoachingContext, ModelInfo } from '@/types/coaching';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Life Trajectory Exercise Model
 * Specialized coaching model for new journalers (users with <2 entries)
 * Guides users through understanding where their current actions are leading them
 * and presents 3 potential life paths based on their current patterns
 */
export class LifeTrajectoryModel implements CoachingModel {
  private static readonly PROMPTS_DIR = join(process.cwd(), 'src/lib/coaching/models/lifeTrajectoryModel/prompts');

  getInfo(): ModelInfo {
    return {
      id: 'life-trajectory',
      name: 'Life Trajectory Exercise',
      description: 'Interactive exercise for new journalers to explore potential life paths based on current actions',
      version: '1.0.0'
    };
  }

  canHandle(context: CoachingContext): boolean {
    // This model is designed for new users with limited journaling history
    return context.entryCount < 2;
  }

  /**
   * Read prompt file content
   */
  private readPromptFile(filename: string): string {
    try {
      const filePath = join(LifeTrajectoryModel.PROMPTS_DIR, filename);
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error reading Life Trajectory prompt file ${filename}:`, error);
      throw new Error(`Failed to load Life Trajectory prompt file: ${filename}`);
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
    const entryCountText = context.entryCount === 0 ? 'This is their first journal entry' : `They have ${context.entryCount} previous entry`;
    
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

    contextMessage += `\n\nGuide them through the Life Trajectory Exercise. Start by asking about current actions in life areas that relate to what they've written about, then progressively build understanding of their patterns before presenting the three trajectory scenarios.`;

    return contextMessage;
  }
} 