export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDisplayDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Strip HTML tags and return clean text for preview
export const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Count words in entry content
export const countWords = (content: string): number => {
  const text = stripHtml(content).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
};

// Calculate line width based on word count (max 20px at 200+ words, min 10px)
export const calculateLineWidth = (wordCount: number): number => {
  if (wordCount === 0) return 10;
  return Math.max(Math.min((wordCount / 200) * 20, 20), 10);
};

type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

// Get all entries sorted by date and time (newest first)
export const getAllEntriesChronological = (entries: Record<string, JournalEntry[]>): Array<{ entry: JournalEntry; dateKey: string }> => {
  const allEntries: Array<{ entry: JournalEntry; dateKey: string }> = [];
  
  Object.keys(entries).forEach(dateKey => {
    const dayEntries = entries[dateKey] || [];
    // Sort entries for this day by timestamp (newest first)
    const sortedDayEntries = [...dayEntries].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    sortedDayEntries.forEach(entry => {
      allEntries.push({ entry, dateKey });
    });
  });
  
  // Sort all entries by date and time (newest first)
  return allEntries.sort((a, b) => {
    const dateA = new Date(a.dateKey + 'T' + a.entry.timestamp.toTimeString());
    const dateB = new Date(b.dateKey + 'T' + b.entry.timestamp.toTimeString());
    return dateB.getTime() - dateA.getTime();
  });
};