# Coaching Cards LLM Integration Guide

## Overview

The coaching system uses specialized UI cards that can be embedded in AI responses using a specific markdown-like syntax. These cards provide structured, interactive summaries of coaching sessions that users can edit directly.

## Card Types & Syntax

### 1. FocusCard - Main Goal/Objective

**Syntax:**
```
[focus:focus="Main goal statement",context="Optional additional context"]
```

**Parameters:**
- `focus` (required): The user's primary goal or focus area
- `context` (optional): Additional background or context

**Example:**
```
[focus:focus="Build a consistent morning routine that energizes me for productive days",context="Currently struggling with inconsistent wake times and feeling sluggish in the mornings"]
```

**Best Practices:**
- Keep focus statement clear and actionable
- Use context to provide relevant background
- Make it personal and specific to the user

### 2. BlockersCard - Limiting Factors

**Syntax:**
```
[blockers:items="Item 1|Item 2|Item 3",title="Optional custom title"]
```

**Parameters:**
- `items` (required): Pipe-separated list of blocking factors
- `title` (optional): Custom title (defaults to "Key Blockers")

**Example:**
```
[blockers:items="Staying up too late scrolling social media|No accountability system in place|Bedroom environment not optimized for sleep",title="What's Getting in the Way"]
```

**Best Practices:**
- List 2-5 concrete, specific blockers
- Focus on actionable obstacles, not vague concepts
- Order by impact or priority

### 3. ActionPlanCard - Next Steps

**Syntax:**
```
[actions:items="Action 1|Action 2|Action 3",title="Optional custom title"]
```

**Parameters:**
- `items` (required): Pipe-separated list of action steps
- `title` (optional): Custom title (defaults to "Action Plan")

**Example:**
```
[actions:items="Set phone to airplane mode at 9 PM daily|Buy blackout curtains and white noise machine|Create a simple 15-minute morning routine: stretch, hydrate, journal|Find an accountability partner or use a habit tracking app"]
```

**Best Practices:**
- List 3-6 specific, actionable steps
- Make each action concrete and measurable
- Order by priority or logical sequence
- Use active voice and clear language

### 4. CheckInCard - Follow-up Agreement

**Syntax:**
```
[checkin:frequency="FREQUENCY_OPTION",what="What to check-in about",notes="Additional notes"]
```

**Parameters:**
- `frequency` (required): Must be one of the 4 exact options below
- `what` (optional): Description of what to check-in about
- `notes` (optional): Additional context or instructions

**Frequency Options (EXACT STRINGS REQUIRED):**
1. `"multiple times a day"`
2. `"once a day"`
3. `"throughout the week"`
4. `"once a week"`

**Example:**
```
[checkin:frequency="once a day",what="morning routine progress and energy levels",notes="Focus on the phone boundary first - that's your keystone habit"]
```

**Best Practices:**
- Always use exact frequency strings
- Make "what" specific to the coaching goal
- Use notes for encouragement or key focus areas

## Usage Guidelines

### When to Use Cards

Use coaching cards for:
- **Session summaries** - End of coaching conversations
- **Goal setting** - When establishing new objectives
- **Progress reviews** - Checking in on existing plans
- **Action planning** - Converting insights into steps

### Card Combinations

**Typical Session Summary:**
```markdown
## Session Summary

Great work today! Here's what we discovered and planned together:

[focus:focus="Your main goal"]

[blockers:items="Blocker 1|Blocker 2|Blocker 3"]

[actions:items="Action 1|Action 2|Action 3"]

[checkin:frequency="once a day",what="specific check-in topic"]

Remember, you've got this! 🌟
```

**Goal Setting Session:**
```markdown
[focus:focus="New goal",context="Why this matters now"]

[blockers:items="Potential obstacles"]

[actions:items="First steps to take"]
```

**Quick Check-in:**
```markdown
[checkin:frequency="throughout the week",what="progress on specific habit"]
```

### Content Guidelines

**Focus Cards:**
- Be specific and personal
- Use the user's own language when possible
- Make it inspiring but realistic

**Blocker Cards:**
- Focus on addressable obstacles
- Avoid judgment or negative framing
- Keep it solution-oriented

**Action Cards:**
- Start with immediate next steps
- Include both small wins and bigger moves
- Be specific about timing when relevant

**Check-in Cards:**
- Match frequency to the goal complexity
- Make "what" measurable when possible
- Use encouraging tone in notes

## Technical Requirements

### String Formatting
- Use double quotes for all parameter values
- Escape internal quotes with `\"`
- Use pipe `|` separator for list items
- No line breaks within card syntax

### Parameter Validation
- `frequency` must match exact strings
- Empty `items` will be filtered out
- Missing required parameters will show defaults

### Error Handling
- Invalid frequency defaults to "once a day"
- Missing focus shows "Main focus not specified"
- Empty items arrays are handled gracefully

## Examples by Use Case

### Morning Routine Coaching
```
[focus:focus="Establish a consistent 6 AM wake-up with energizing routine",context="Currently waking up between 7-9 AM and feeling groggy"]

[blockers:items="Going to bed too late (after 11 PM)|No morning accountability|Snoozing alarm multiple times"]

[actions:items="Set consistent bedtime of 10:30 PM tonight|Place alarm across the room|Prepare workout clothes the night before|Start with just 15 minutes of movement"]

[checkin:frequency="once a day",what="wake-up time and morning energy levels",notes="Small wins build momentum - focus on consistency over perfection"]
```

### Career Transition Support
```
[focus:focus="Transition from marketing to UX design within 6 months",context="Currently have marketing background but passionate about design"]

[blockers:items="No formal UX education|Limited portfolio|Network mostly in marketing|Fear of salary decrease"]

[actions:items="Enroll in UX bootcamp or online course|Start personal project to build portfolio|Reach out to 3 UX professionals for informational interviews|Research salary ranges in target companies"]

[checkin:frequency="throughout the week",what="learning progress and networking activities",notes="Career transitions take time - celebrate each step forward"]
```

### Productivity & Focus
```
[focus:focus="Achieve 4 hours of deep work daily on priority projects"]

[blockers:items="Constant email notifications|Open office distractions|Unclear priorities|Perfectionism causing delays"]

[actions:items="Block calendar for deep work 9-11 AM|Use noise-canceling headphones|Turn off all notifications during focus blocks|Choose max 3 priorities each day"]

[checkin:frequency="multiple times a day",what="deep work session completion and focus quality"]
```

Remember: The goal is to create actionable, personalized coaching summaries that users can immediately understand and modify to fit their needs. 