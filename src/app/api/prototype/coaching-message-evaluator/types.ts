import { z } from 'zod';

export enum MessageType {
  CHECK_IN = "check_in",                      // Accountability check-ins to help users stay on track with their goals and commitments
  ENCOURAGEMENT = "encouragement",            // Positive reinforcement and celebration of progress, efforts, or achievements
  CHALLENGE = "challenge",                    // Growth opportunities that push users out of their comfort zone in a supportive way
  REMINDER = "reminder",                      // Gentle nudges about practices, habits, or commitments they've made
  ALIGNMENT_REFLECTION = "alignment_reflection", // Questions that help users reflect on their core purpose, values, and life direction
  GENERAL_REFLECTION = "general_reflection",     // Broader questions that promote self-understanding and awareness
  PERSONAL_INSIGHT = "personal_insight",         // Deep insights about the user's patterns, behaviors, or potential based on their data
  RELEVANT_LESSON = "relevant_lesson"            // Applicable wisdom, lessons, or perspectives that could benefit the user's current situation
}

export type CoachingMessage = {
  id: string;
  userId: string;
  messageType: MessageType;
  pushNotificationText: string;  // Short text for Apple push notifications
  fullMessage: string;           // Complete in-app message content
  generatedAt: Date;
  sentAt?: Date;              // null if not sent yet
  userEngagement?: {
    readAt?: Date;
    dismissedAt?: Date;
    repliedAt?: Date;
  };
  aiMetadata: {
    confidenceScore: number;   // 0-1 scale
    reasoningSteps: string[];
  };
};

export type UserContext = {
  userId: string;
  recentMessages: CoachingMessage[];
  alignmentDoc: any; // Will use the existing alignment doc type
  recentJournalEntries: any[]; // Will use the existing journal entry type
  lastMessageSentAt: Date | null;
};

// Step 1: Impact Evaluation Response Schema
export const ImpactEvaluationSchema = z.object({
  thinking: z.string(),
  recommendedMessageType: z.nativeEnum(MessageType),
  pushNotificationText: z.string(),
  fullMessage: z.string()
});

export type ImpactEvaluation = z.infer<typeof ImpactEvaluationSchema>;

// Step 2: Outcome Simulation Response Schema
export const OutcomeSimulationSchema = z.object({
  thinking: z.string(),
  originalMessageAnalysis: z.object({
    psychologicalFit: z.number().min(0).max(10),
    timingOptimality: z.number().min(0).max(10),
    likelyUserResponse: z.string(),
    primaryRisks: z.array(z.string())
  }),
  optimizedPushNotification: z.string(),
  optimizedFullMessage: z.string(),
  optimizedMessageAnalysis: z.object({
    messageExcellence: z.number().min(0).max(10),
    pushNotificationAppeal: z.number().min(0).max(10),
    improvementAchieved: z.string(),
    likelyUserResponse: z.string(),
    remainingRisks: z.array(z.string())
  }),
  finalDecision: z.enum(["SEND", "DONT_SEND"]),
  strategicReasoning: z.string(),
  confidenceScore: z.number().min(0).max(1)
});

export type OutcomeSimulation = z.infer<typeof OutcomeSimulationSchema>;

export type EvaluationResult = {
  shouldSend: boolean;
  message?: CoachingMessage;
  reasoning: string;
}; 