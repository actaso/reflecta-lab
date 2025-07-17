// Coaching business logic exports
export { CoachingContextBuilder } from './contextBuilder';

// Multi-model coaching system
export { ModelRegistry } from './modelRegistry';
export { GeneralCoachingModel } from './models/generalCoachingModel/generalCoachingModel';
export { LifeTrajectoryModel } from './models/lifeTrajectoryModel/lifeTrajectoryModel';

/**
 * Initialize all coaching models
 * Call this function to register all available models
 */
export async function initializeCoachingModels() {
  const { ModelRegistry } = await import('./modelRegistry');
  const { GeneralCoachingModel } = await import('./models/generalCoachingModel/generalCoachingModel');
  const { LifeTrajectoryModel } = await import('./models/lifeTrajectoryModel/lifeTrajectoryModel');

  ModelRegistry.register(new GeneralCoachingModel());
  ModelRegistry.register(new LifeTrajectoryModel());
  
  console.log('🎯 Coaching models initialized');
}