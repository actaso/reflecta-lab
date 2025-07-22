'use client';

import CoachingMessage from './CoachingMessage';

export default function CoachingSummaryDemo() {
  // Example of how the AI would generate a coaching session summary
  const summaryMessage = {
    id: 'summary-demo',
    role: 'assistant' as const,
    content: `## Session Summary

Great work today! Here's what we discovered and planned together:

[focus:focus="Build a consistent morning routine that energizes me for productive days",context="Currently struggling with inconsistent wake times and feeling sluggish in the mornings"]

[blockers:items="Staying up too late scrolling social media|No accountability system in place|Bedroom environment not optimized for sleep",title="What's Getting in the Way"]

[actions:items="Set phone to airplane mode at 9 PM daily|Buy blackout curtains and white noise machine|Create a simple 15-minute morning routine: stretch, hydrate, journal|Find an accountability partner or use a habit tracking app"]

[checkin:frequency="once a day",what="morning routine progress and energy levels",notes="Focus on the phone boundary first - that's your keystone habit"]

Remember, start small and be consistent. You've got this! 🌟

**✨ Try hovering and clicking on any text to edit it directly!**`,
    timestamp: new Date()
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Coaching Summary Cards Demo</h1>
        <p className="text-gray-600">
          This shows how the AI can create structured, actionable summaries using multiple specialized cards.
        </p>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <CoachingMessage message={summaryMessage} />
      </div>

      <div className="mt-8 space-y-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">🎯 Gentle Editing Features:</h3>
          <div className="text-sm text-green-700 space-y-1">
            <div>• <strong>Hover to discover</strong> - text becomes subtly highlighted when editable</div>
            <div>• <strong>Click to edit</strong> - no mode switching, just click any text to modify</div>
            <div>• <strong>Auto-save on blur</strong> - changes save automatically when you click away</div>
            <div>• <strong>Frequency dropdown</strong> - 4 options: multiple times a day, once a day, throughout the week, once a week</div>
            <div>• <strong>Add/remove items</strong> - hover to reveal + and × buttons</div>
            <div>• <strong>Keyboard shortcuts</strong> - Enter to save, Escape to cancel</div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🤖 AI Usage Examples:</h3>
          <div className="text-sm text-blue-700 space-y-1 font-mono">
            <div>[focus:focus=&quot;Your main goal&quot;,context=&quot;Optional context&quot;]</div>
            <div>[blockers:items=&quot;Blocker 1|Blocker 2|Blocker 3&quot;,title=&quot;Optional title&quot;]</div>
            <div>[actions:items=&quot;Action 1|Action 2|Action 3&quot;]</div>
            <div>[checkin:frequency=&quot;once a day&quot;,what=&quot;habit progress&quot;,notes=&quot;Keep it simple&quot;]</div>
          </div>
        </div>
      </div>
    </div>
  );
} 