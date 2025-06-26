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
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('YouTube API key not configured');
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.items?.[0]?.snippet?.title || null;
  } catch (error) {
    console.error('Failed to fetch YouTube video title:', error);
    return null;
  }
}
