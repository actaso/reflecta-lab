export const runtime = 'edge';

export async function POST() {
  try {
    return new Response('Chat API temporarily disabled during AI SDK upgrade', { status: 503 });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}