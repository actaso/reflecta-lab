import OpenAI from 'openai';
import { getFirestore } from 'firebase-admin/firestore';
import app from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AlignmentDocData {
  content: string;
  version: number;
  createdAt: number;
  lastUpdatedAt: number;
  userId: string;
}

/**
 * Update alignment document logic - can be called directly or via API
 * Uses Firebase Admin SDK for server-side operations
 */
export async function updateAlignmentDoc(
  conversationHistory: CoachingMessage[],
  userId?: string
): Promise<{ version: number; createdAt: number; lastUpdatedAt: number }> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  console.log(`🧠 Updating alignment doc for user ${userId} with ${conversationHistory.length} messages`);

  // Get Firebase Admin Firestore instance
  if (!app) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  const db = getFirestore(app);

  // Load existing alignment doc if it exists
  const existingDoc = await getExistingAlignmentDoc(db, userId);

  // Initialize OpenRouter client
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Alignment Doc Update',
    },
  });

  // Generate alignment doc analysis prompt
  const analysisPrompt = await generateAlignmentAnalysisPrompt(
    conversationHistory,
    existingDoc?.content
  );

  // Analyze session with LLM
  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      { role: 'system', content: await getAlignmentSystemPrompt() },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3, // Lower temperature for more consistent analysis
    max_tokens: 2000,
  });

  const aiResponse = response.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response from AI model');
  }

  // Save updated alignment doc to Firestore using Admin SDK
  const newVersion = (existingDoc?.version || 0) + 1;
  const now = Date.now();
  
  const alignmentDocData: AlignmentDocData = {
    content: aiResponse,
    version: newVersion,
    createdAt: existingDoc?.createdAt || now, // Preserve existing createdAt or set to now for new docs
    lastUpdatedAt: now,
    userId
  };

  await db.collection('userAlignmentDocs').doc(userId).set(alignmentDocData);

  console.log(`✅ Alignment doc updated for user ${userId}, version ${newVersion}`);

  return {
    version: newVersion,
    createdAt: alignmentDocData.createdAt,
    lastUpdatedAt: alignmentDocData.lastUpdatedAt
  };
}

/**
 * Get existing alignment document from Firestore using Admin SDK
 */
async function getExistingAlignmentDoc(db: FirebaseFirestore.Firestore, userId: string): Promise<AlignmentDocData | null> {
  try {
    const docRef = db.collection('userAlignmentDocs').doc(userId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      return data as AlignmentDocData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching existing alignment doc:', error);
    return null;
  }
}

/**
 * Load and return the alignment document template
 */
async function getAlignmentSystemPrompt(): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), 'src/app/api/prototype/update-alignment-doc/user_alignment_doc.md');
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    console.log(templateContent)

    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    console.log(today)
    
    return `You are an expert coaching facilitator tasked with updating a user's alignment document based on their coaching session.

The date today is ${today}.

Your job is to:
1. Analyze the coaching conversation to extract insights about the user
2. Fill out or update the alignment document template with new information
3. Preserve existing valuable information while incorporating new insights
4. Use the exact template structure provided
5. Fill out each section based on what you learned from the conversation. Don't make things up, stick strictly to real things the client shared or said.
6. If information for a section isn't available from the session, leave it as is or mark as "To be explored in future sessions"

The alignment document follows this template:
${templateContent}

Return ONLY the filled-out alignment document using the exact template structure. Do not include any additional commentary or explanations outside the template.`;

  } catch (error) {
    console.error('Error loading alignment template:', error);
    
    // Fallback system prompt
    return `You are an expert coaching facilitator tasked with creating an alignment document based on a coaching session.

Create a comprehensive alignment document that captures:
- The user's current objectives and goals
- Their current reality and challenges  
- What drives and motivates them
- What stops or limits them
- Their strengths and resources
- Communication preferences
- Action focus areas
- Accountability needs
- Coaching insights

Structure the document clearly with sections and be specific and actionable in your analysis.`;
  }
}

/**
 * Generate analysis prompt from conversation history
 */
async function generateAlignmentAnalysisPrompt(
  conversationHistory: CoachingMessage[],
  existingDocContent?: string
): Promise<string> {
  // Format conversation for analysis
  const transcript = conversationHistory
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  let prompt = `Analyze this coaching session and create/update the user's alignment document:

## Coaching Session Transcript:
${transcript}`;

  if (existingDocContent) {
    prompt += `\n\n## Existing Alignment Document:
${existingDocContent}

Please update the existing document with new insights from this session while preserving valuable existing information.`;
  } else {
    prompt += '\n\nThis is a new alignment document - please fill out all sections based on the coaching session.';
  }

  return prompt;
} 