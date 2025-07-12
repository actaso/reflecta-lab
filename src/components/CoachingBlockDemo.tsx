'use client';

import { useState, useRef } from 'react';
import Editor, { EditorHandle } from './Editor';
import { Button } from './ui/button';

export default function CoachingBlockDemo() {
  const [content, setContent] = useState('');
  const editorRef = useRef<EditorHandle>(null);

  const samplePrompts = [
    "What patterns do you notice in your recent decisions? How might they be shaping your startup's direction?",
    "Reflect on a recent challenge you faced. What did it reveal about your problem-solving approach?",
    "Consider your biggest win this week. What underlying strategy made it possible?",
    "What assumption about your market have you held the longest? When did you last test it?",
    "Think about your team dynamics. What energy are you bringing to collaboration?",
    // Markdown examples
    "**Three key questions** to ask yourself today:\n\n- What's one assumption I haven't tested?\n- Who could give me honest feedback?\n- What would I do if I had unlimited resources?",
    "Consider this framework for decision-making:\n\n1. **Gather** - What data do I need?\n2. **Analyze** - What patterns emerge?\n3. **Decide** - What's the simplest next step?\n4. **Act** - How will I measure progress?",
    "*Sometimes the most important insights come from the questions we're afraid to ask.*\n\nWhat question have you been avoiding about your startup?"
  ];

  const insertRandomPrompt = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    editorRef.current?.insertCoachingBlock(randomPrompt);
  };

  const insertButtonPrompt = () => {
    const buttonOptions = [
      "Deep work",
      "Find mentor", 
      "Research",
      "Document",
      "Strategize"
    ];
    editorRef.current?.insertCoachingBlock(
      "What action would move your startup forward most right now?", 
      'buttons', 
      buttonOptions
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4 p-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold mb-2">AI Coaching Block Demo</h2>
        <Button onClick={insertRandomPrompt} className="mr-2">
          Insert Text Prompt
        </Button>
        <Button onClick={insertButtonPrompt} variant="outline" className="mr-2">
          Insert Button Options
        </Button>
        <p className="text-sm text-gray-600 mt-2">
          Try both variants: text prompts for reflection and button options for actionable choices. Press space at the beginning of a line for random coaching blocks!
        </p>
      </div>
      
      <div className="flex-1">
        <Editor
          ref={editorRef}
          content={content}
          onChange={setContent}
          placeholder="Start writing... or insert a coaching block above!"
          autoFocus={true}
        />
      </div>
    </div>
  );
}