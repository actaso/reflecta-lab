/**
 * Pulse notification utilities
 * Handles morning reminders and notification scheduling
 */

export interface NotificationPreferences {
  enabled: boolean;
  time: string; // HH:MM format
  timezone: string;
}

/**
 * Check if user should receive a pulse notification
 */
export function shouldShowPulseNotification(
  lastPulseDate?: string,
  preferences: NotificationPreferences = {
    enabled: true,
    time: '09:00',
    timezone: 'America/New_York'
  }
): boolean {
  if (!preferences.enabled) return false;

  const today = new Date().toISOString().split('T')[0];
  
  // Show notification if no pulse completed today
  return !lastPulseDate || lastPulseDate !== today;
}

/**
 * Get time-based motivational message
 */
export function getPulseMotivationalMessage(): string {
  const hour = new Date().getHours();
  
  const messages = {
    morning: [
      "Good morning! Start your day with clarity. Take your leadership pulse.",
      "Rise and reflect! How are you feeling as a leader today?",
      "A great day starts with self-awareness. Quick pulse check?"
    ],
    afternoon: [
      "Midday check-in: How's your leadership energy?",
      "Taking a moment to reflect can boost your afternoon performance.",
      "Quick break? Check in with your leadership pulse."
    ],
    evening: [
      "End your day with intention. How did you show up as a leader?",
      "Reflect on your leadership journey today.",
      "A quick pulse check to wrap up your day mindfully."
    ]
  };

  let timeCategory: keyof typeof messages;
  if (hour < 12) timeCategory = 'morning';
  else if (hour < 17) timeCategory = 'afternoon';
  else timeCategory = 'evening';

  const categoryMessages = messages[timeCategory];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Show browser notification for pulse reminder
 */
export function showPulseNotification(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const message = getPulseMotivationalMessage();
  
  new Notification('Leadership Pulse', {
    body: message,
    icon: '/pulse-icon.png', // Add this icon to public folder
    badge: '/pulse-badge.png', // Add this badge to public folder
    tag: 'pulse-reminder',
    requireInteraction: false,
    silent: false
  });
}

/**
 * Schedule daily pulse notifications
 * This is a basic implementation - in production you'd use a more robust scheduler
 */
export function scheduleDailyPulseNotification(
  preferences: NotificationPreferences,
  callback: () => void
): () => void {
  if (!preferences.enabled) {
    return () => {}; // Return empty cleanup function
  }

  // Parse time preference
  const [hours, minutes] = preferences.time.split(':').map(Number);
  
  const scheduleNextNotification = () => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If today's time has passed, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    return setTimeout(() => {
      // Check if user needs pulse reminder
      if (shouldShowPulseNotification()) {
        callback();
        showPulseNotification();
      }
      
      // Schedule next day's notification
      scheduleNextNotification();
    }, timeUntilNotification);
  };

  const timeoutId = scheduleNextNotification();
  
  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}