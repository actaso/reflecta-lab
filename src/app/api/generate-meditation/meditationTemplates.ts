export interface AudioComponent {
  type: 'background' | 'narrator' | 'personalized';
  file?: string;
  startTime: number;
  endTime?: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface PersonalizedSegment {
  type: 'greeting' | 'midpoint' | 'closing';
  startTime: number;
  duration: number;
  text: (firstName: string) => string;
}

export interface MeditationTemplate {
  duration: string;
  totalDuration: number; // in seconds
  components: AudioComponent[];
  personalizedSegments: PersonalizedSegment[];
}

export const MEDITATION_TEMPLATES: Record<string, MeditationTemplate> = {
  '2m': {
    duration: '2m',
    totalDuration: 120,
    components: [
      {
        type: 'background',
        file: '/audio/bg-music.mp3',
        startTime: 0,
        endTime: 120,
        volume: 0.3,
        fadeIn: 2,
        fadeOut: 5
      }
    ],
    personalizedSegments: [
      {
        type: 'greeting',
        startTime: 0,
        duration: 5,
        text: (firstName: string) => `Welcome, ${firstName}. Take a moment to find a comfortable position and close your eyes.`
      },
      {
        type: 'closing',
        startTime: 110,
        duration: 5,
        text: (firstName: string) => `Great job, ${firstName}. You've completed your meditation. Take a deep breath and gently open your eyes when you're ready.`
      }
    ]
  },
  '5m': {
    duration: '5m',
    totalDuration: 300,
    components: [
      {
        type: 'background',
        file: '/audio/bg-music.mp3',
        startTime: 0,
        endTime: 300,
        volume: 0.3,
        fadeIn: 3,
        fadeOut: 8
      }
    ],
    personalizedSegments: [
      {
        type: 'greeting',
        startTime: 0,
        duration: 8,
        text: (firstName: string) => `Welcome, ${firstName}. Take a moment to find a comfortable position, close your eyes, and begin to notice your breath.`
      },
      {
        type: 'midpoint',
        startTime: 150,
        duration: 8,
        text: (firstName: string) => `You're doing wonderfully, ${firstName}. Continue to breathe deeply and let any thoughts drift away like clouds in the sky.`
      },
      {
        type: 'closing',
        startTime: 290,
        duration: 8,
        text: (firstName: string) => `Beautiful work, ${firstName}. Your meditation is complete. Take a few moments to gradually return to awareness, and open your eyes when you feel ready.`
      }
    ]
  }
};

export function getTemplate(duration: string): MeditationTemplate | null {
  return MEDITATION_TEMPLATES[duration] || null;
}

export function getSupportedDurations(): string[] {
  return Object.keys(MEDITATION_TEMPLATES);
} 