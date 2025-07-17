// Coaching business logic exports
export { CoachingContextBuilder } from './contextBuilder';

// Multi-model coaching system
export { ModelRegistry } from './modelRegistry';
export { GeneralCoachingModel } from './models/generalCoachingModel/generalCoachingModel';
export { BiggestStruggleModel } from './models/biggestStruggle/biggestStruggle';

/**
 * Initialize all coaching models
 * Call this function to register all available models
 */
export async function initializeCoachingModels() {
  const { ModelRegistry } = await import('./modelRegistry');
  const { GeneralCoachingModel } = await import('./models/generalCoachingModel/generalCoachingModel');
  const { BiggestStruggleModel } = await import('./models/biggestStruggle/biggestStruggle');

  ModelRegistry.register(new GeneralCoachingModel());
  ModelRegistry.register(new BiggestStruggleModel());
  
  console.log('🎯 Coaching models initialized');
}