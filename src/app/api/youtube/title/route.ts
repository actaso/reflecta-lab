export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response('Video ID is required', { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return new Response('YouTube API key not configured', { status: 500 });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );
    
    if (!response.ok) {
      return new Response('Failed to fetch video data', { status: response.status });
    }
    
    const data = await response.json();
    const title = data.items?.[0]?.snippet?.title || null;
    
    return Response.json({ title });
  } catch (error) {
    console.error('YouTube API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
