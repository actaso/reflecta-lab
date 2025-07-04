import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import FirestoreAdminService from '@/lib/firestore-admin';
import OpenAI from 'openai';
import { JournalEntry } from '@/types/journal';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { forceGenerate = false, journalEntries = [] } = await req.json();

    // Check if user needs new morning guidance (unless forcing)
    if (!forceGenerate) {
      const shouldGenerate = await FirestoreAdminService.shouldGenerateNewMorningGuidance(userId);
      if (!shouldGenerate) {
        return NextResponse.json({ 
          message: 'Morning guidance already generated for today',
          generated: false 
        });
      }
    }

    // Filter entries from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Convert journal entries to proper format (they come as plain objects from JSON)
    const typedEntries: JournalEntry[] = journalEntries.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
      lastUpdated: new Date(entry.lastUpdated)
    }));

    const recentEntries = typedEntries.filter(entry => 
      entry.timestamp >= sevenDaysAgo
    );

    // If no entries, return a default guidance
    if (recentEntries.length === 0) {
      return NextResponse.json({ 
        journalQuestion: "What's one intention you want to set for today?",
        detailedMorningPrompt: "What's one intention you want to set for today that aligns with your deeper purpose?",
        reasoning: "Start your day with intentional reflection. Setting a clear intention helps guide your decisions and actions throughout the day.",
        generated: true
      });
    }

    // Convert entries to text format for OpenAI
    const entriesText = recentEntries
      .map(entry => {
        const date = entry.timestamp.toISOString().split('T')[0];
        const timeString = entry.timestamp.toLocaleTimeString();
        // Strip HTML tags from content
        const plainText = entry.content.replace(/<[^>]*>/g, '');
        return `${date} ${timeString}:\n${plainText}\n`;
      })
      .join('\n---\n\n');

    // Call OpenAI responses API with prompt ID
    const response = await openai.responses.create({
      model: "gpt-4.1",
      prompt: {
        "id": "pmpt_6863a1325d188194a6ed0e6d4f6c497e04a21a1258fc00ec",
      },
      input: [
        {
          "role": "user",
          "content": [
            {
              "type": "input_text", 
              "text": entriesText
            }
          ]
        }
      ]
    });

    // Extract the guidance from the response
    let journalQuestion = "What's one intention you want to set for today that aligns with your deeper purpose?";
    let detailedMorningPrompt = "What's one intention you want to set for today that aligns with your deeper purpose?";
    let reasoning = "Start your day with intentional reflection. Setting a clear intention helps guide your decisions and actions throughout the day.";
    
    if (response.output && response.output.length > 0) {
      for (const outputItem of response.output) {
        if (outputItem.type === 'message' && outputItem.content) {
          for (const contentItem of outputItem.content) {
            if (contentItem.type === 'output_text' && 'text' in contentItem) {
              const responseText = contentItem.text;
              
              // Extract JSON from <result> tags
              console.log('🔍 [DEBUG] Full OpenAI response text:', responseText);
              const resultMatch = responseText.match(/<result>\s*```json\s*([\s\S]*?)\s*```\s*<\/result>/);
              if (resultMatch) {
                console.log('🔍 [DEBUG] Extracted JSON string:', resultMatch[1]);
                try {
                  const jsonData = JSON.parse(resultMatch[1]);
                  console.log('🔍 [DEBUG] Parsed JSON data:', jsonData);
                  if (jsonData.journalQuestion) {
                    journalQuestion = jsonData.journalQuestion;
                  }
                  if (jsonData.detailedMorningPrompt) {
                    detailedMorningPrompt = jsonData.detailedMorningPrompt;
                  }
                  if (jsonData.reasoning) {
                    reasoning = jsonData.reasoning;
                  }
                  console.log('🔍 [DEBUG] Final extracted values:', { journalQuestion, detailedMorningPrompt, reasoning });
                } catch (parseError) {
                  console.error('Failed to parse JSON from OpenAI response:', parseError);
                  console.error('Raw JSON string that failed to parse:', resultMatch[1]);
                  // Keep default values if parsing fails
                }
              } else {
                console.warn('🔍 [DEBUG] No <result> tags found in OpenAI response');
              }
              break;
            }
          }
        }
      }
    }

    // Update the last generated timestamp
    await FirestoreAdminService.updateLastMorningGuidanceGenerated(userId);

    return NextResponse.json({ 
      journalQuestion,
      detailedMorningPrompt,
      reasoning,
      generated: true
    });

  } catch (error) {
    console.error('Morning guidance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}