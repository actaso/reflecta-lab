export interface YouTubeVideoInfo {
  id: string;
  title: string;
  url: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export async function fetchYouTubeVideoTitle(videoId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/youtube/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId }),
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch YouTube video title:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.title || null;
  } catch (error) {
    console.error('Failed to fetch YouTube video title:', error);
    return null;
  }
}
