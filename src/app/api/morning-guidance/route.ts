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
      const existingGuidance = await FirestoreAdminService.getCurrentMorningGuidance(userId);
      if (existingGuidance) {
        // Check if guidance was already used today - if so, don't generate new guidance
        const guidanceWithUsed = existingGuidance as typeof existingGuidance & { isUsed?: boolean };
        if (guidanceWithUsed.isUsed) {
          return NextResponse.json({ 
            journalQuestion: '',
            detailedMorningPrompt: '',
            reasoning: '',
            generated: false,
            fromCache: false,
            alreadyUsed: true
          });
        }
        
        return NextResponse.json({ 
          journalQuestion: existingGuidance.journalQuestion,
          detailedMorningPrompt: existingGuidance.detailedMorningPrompt,
          reasoning: existingGuidance.reasoning,
          generated: false,
          fromCache: true
        });
      }
    }

    // Get user alignment for context
    const userAccount = await FirestoreAdminService.getUserAccount(userId);
    const alignment = userAccount.alignment || "Not specified";

    // Convert journal entries to proper format (they come as plain objects from JSON)
    const typedEntries: JournalEntry[] = journalEntries.map((entry: Record<string, unknown>) => ({
      ...entry,
      timestamp: new Date(entry.timestamp as string | number | Date),
      lastUpdated: new Date(entry.lastUpdated as string | number | Date)
    }));

    // Sort by timestamp (newest first) and take the last 10 entries
    const recentEntries = typedEntries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // If no entries, return a default guidance
    if (recentEntries.length === 0) {
      return NextResponse.json({ 
        journalQuestion: "What's one intention you want to set for today?",
        detailedMorningPrompt: "What's one intention you want to set for today that aligns with your deeper purpose?",
        reasoning: "Start your day with intentional reflection. Setting a clear intention helps guide your decisions and actions throughout the day.",
        generated: true
      });
    }

    // Helper function to calculate days ago
    const getDaysAgo = (date: Date): string => {
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      return `${diffDays} days ago`;
    };

    // Format entries for LLM consumption
    const entriesText = recentEntries
      .map(entry => {
        const date = entry.timestamp.toISOString().split('T')[0];
        const daysAgo = getDaysAgo(entry.timestamp);
        // Strip HTML tags from content
        const plainText = entry.content.replace(/<[^>]*>/g, '').trim();
        return `### ${daysAgo} (${date})\n${plainText}`;
      })
      .join('\n\n');

    // Create the formatted prompt
    const formattedPrompt = `Client's current main objective: ${alignment}

Client's last ${recentEntries.length} journaling entries:

${entriesText}`;

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
              "text": formattedPrompt
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
              
              // Parse the response as JSON (handle markdown code blocks)
              try {
                // Strip markdown code block formatting if present
                let cleanedText = responseText.trim();
                if (cleanedText.startsWith('```json')) {
                  cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                }
                
                const jsonData = JSON.parse(cleanedText);
                
                if (jsonData.journalQuestion) {
                  journalQuestion = jsonData.journalQuestion;
                }
                if (jsonData.detailedMorningPrompt) {
                  detailedMorningPrompt = jsonData.detailedMorningPrompt;
                }
                if (jsonData.reasoning) {
                  reasoning = jsonData.reasoning;
                }
              } catch (parseError) {
                console.error('Failed to parse JSON from OpenAI response:', parseError);
                console.error('Raw response text that failed to parse:', responseText);
                // Keep default values if parsing fails
              }
              break;
            }
          }
        }
      }
    }

    // Save the guidance to the user account
    await FirestoreAdminService.saveMorningGuidance(userId, {
      journalQuestion,
      detailedMorningPrompt,
      reasoning
    });

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

export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === 'markAsUsed') {
      await FirestoreAdminService.markGuidanceAsUsed(userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss') {
      await FirestoreAdminService.markGuidanceAsUsed(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Morning guidance PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}