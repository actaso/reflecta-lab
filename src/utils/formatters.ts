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