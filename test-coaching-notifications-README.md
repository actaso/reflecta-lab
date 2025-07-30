# Coaching Notifications Test Script

This script tests the coaching message evaluator API for the past 7 days and generates a beautiful HTML report showing what notifications would have been sent and when.

## Prerequisites

1. **Next.js Development Server**: Make sure your Next.js app is running
   ```bash
   npm run dev
   ```

2. **Required Tools**: The script uses `curl`, `jq`, and `bc`
   - On macOS: `brew install jq` (curl and bc are usually pre-installed)
   - On Ubuntu/Debian: `sudo apt install curl jq bc`
   - The script is now compatible with both macOS and Linux date commands

## Usage

### Quick Start

1. **Run the script with default settings:**
   ```bash
   ./test-coaching-notifications.sh
   ```

2. **The script will:**
   - Test the API for the past 7 days
   - Generate an HTML report (`coaching-notifications-test-report.html`)
   - Automatically open the report in your browser

### Customization

Edit the script to customize these settings:

```bash
# Configuration (at the top of the script)
API_BASE_URL="http://localhost:3000"  # Your dev server URL
USER_ID="test-user-123"               # User ID to test with
OUTPUT_FILE="coaching-notifications-test-report.html"  # Report filename
```

### Testing with Real Users

To test with a real user:

1. Open `test-coaching-notifications.sh`
2. Change `USER_ID="test-user-123"` to a real user ID from your database
3. Run the script

## What the Script Tests

The script simulates the coaching message evaluator for each of the past 7 days, showing:

- **Date/Time Context**: Each test includes the specific day and time
- **AI Decision**: Whether a message would be sent or not
- **Message Content**: Push notification text and full message content
- **AI Reasoning**: Why the AI made its decision
- **Confidence Scores**: How confident the AI was in its decision
- **Message Types**: What type of coaching message was suggested

## Understanding the Results

### HTML Report Sections

1. **Test Configuration**: Shows what was tested and when
2. **Daily Results**: Each day shows:
   - ✅ **Message Sent**: Green header with message details
   - ⏸ **No Message**: Red header with reasoning why not
   - ❌ **API Error**: Any technical issues
3. **Summary Statistics**: Overall stats about the test run

### Message Types

The AI can suggest these types of coaching messages:
- `check_in` - Accountability check-ins
- `encouragement` - Positive reinforcement
- `challenge` - Growth opportunities
- `reminder` - Gentle nudges
- `alignment_reflection` - Purpose/values questions
- `general_reflection` - Self-understanding questions
- `personal_insight` - Pattern insights
- `relevant_lesson` - Applicable wisdom

### Confidence Scores

- 🟢 **High (70%+)**: AI is very confident in the decision
- 🟡 **Medium (50-70%)**: AI has moderate confidence
- 🔴 **Low (<50%)**: AI is uncertain

## Troubleshooting

### "API not accessible" Error
- Make sure your Next.js dev server is running (`npm run dev`)
- Check that the `API_BASE_URL` in the script matches your server

### "jq: command not found"
- Install jq: `brew install jq` (macOS) or `sudo apt install jq` (Linux)

### "bc: command not found"  
- Install bc: `brew install bc` (macOS) or `sudo apt install bc` (Linux)

### Empty Results
- Check that the USER_ID exists in your database
- Verify the user has some journal entries or coaching history

## Example Output

```bash
🤖 Coaching Message Evaluator - 7-Day Test
==================================================
User ID: test-user-123
API Base: http://localhost:3000
Output: coaching-notifications-test-report.html

🔍 Checking API accessibility...
✅ API is accessible

🧪 Running 7-day test simulation...

📅 Testing day 1/7: Monday, December 16, 2024 at 02:30 PM
   Making API request...
   ✅ Message would be sent
   User has been consistent with journaling and ready for accountability check-in...

📅 Testing day 2/7: Tuesday, December 17, 2024 at 02:30 PM
   Making API request...
   ⏸ Message would NOT be sent
   User recently received a message and needs time to process...

...

==================================================
✅ 7-day test completed!

📊 Summary:
   Total days tested: 7
   Messages that would be sent: 3
   Messages that would be skipped: 4
   Average confidence: 82.5%

📄 HTML Report generated: coaching-notifications-test-report.html
   Open it in your browser to see detailed results

🚀 Opening report in browser...
```

The HTML report will open automatically and show a detailed, visual breakdown of all the results. 