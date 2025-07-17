import { CoachingModel, CoachingContext, ModelRoutingDecision } from '@/types/coaching';

/**
 * Central registry for all coaching models
 * Manages model registration, discovery, and routing
 */
export class ModelRegistry {
  private static models: Map<string, CoachingModel> = new Map();

  /**
   * Register a coaching model
   */
  static register(model: CoachingModel): void {
    const info = model.getInfo();
    this.models.set(info.id, model);
    console.log(`📝 Registered coaching model: ${info.name} (${info.id})`);
  }

  /**
   * Get a specific model by ID
   */
  static getModel(modelId: string): CoachingModel | null {
    return this.models.get(modelId) || null;
  }

  /**
   * Get all registered models
   */
  static getAllModels(): CoachingModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Find the best model for a given context
   */
  static routeToModel(context: CoachingContext): ModelRoutingDecision {
    const candidates: ModelRoutingDecision[] = [];

    // Evaluate each model
    for (const model of this.models.values()) {
      if (model.canHandle(context)) {
        const info = model.getInfo();
        
        // Simple routing logic for now - can be extended
        let confidence = 0.5; // Base confidence
        let reason = `Model ${info.name} can handle this context`;

        // Entry count based routing
        if (info.id === 'biggest-struggle' && context.entryCount === 1) {
          confidence = 0.9;
          reason = `Very first entry (${context.entryCount} entries) - using Biggest Struggle`;
        } else if (info.id === 'general-coaching' && context.entryCount >= 2) {
          confidence = 0.8;
          reason = `Experienced user with ${context.entryCount} entries - using General Coaching`;
        }

        candidates.push({
          modelId: info.id,
          reason,
          confidence
        });
      }
    }

    // Sort by confidence and return the best match
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    if (candidates.length === 0) {
      throw new Error('No suitable coaching model found for the given context');
    }

    return candidates[0];
  }

  /**
   * Get model information for debugging
   */
  static getRegistryInfo(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.models.values()).map(model => {
      const info = model.getInfo();
      return {
        id: info.id,
        name: info.name,
        description: info.description
      };
    });
  }
} 