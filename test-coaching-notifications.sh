#!/bin/bash

# Coaching Message Evaluator - 7-Day Test Script
# This script tests the coaching message evaluator API for the past 7 days
# and generates an HTML report showing all results for debugging

set -e

# Configuration
API_BASE_URL="http://localhost:3000"  # Adjust if your dev server runs on different port
USER_ID="user_2z09PNxhYSTJRbItrcQzyLOc5H3"  # Change this to test with a real user ID
OUTPUT_FILE="coaching-notifications-test-report.html"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Coaching Message Evaluator - 7-Day Test${NC}"
echo "=================================================="
echo "User ID: $USER_ID"
echo "API Base: $API_BASE_URL"
echo "Output: $OUTPUT_FILE"
echo ""

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or sudo apt install jq (Linux)"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    echo -e "${RED}❌ Error: bc is required but not installed${NC}"
    echo "Install with: brew install bc (macOS) or sudo apt install bc (Linux)"
    exit 1
fi

# Check if API is accessible
echo -e "${YELLOW}🔍 Checking API accessibility...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/prototype/coaching-message-evaluator" | grep -q "200"; then
    echo -e "${RED}❌ Error: API not accessible at $API_BASE_URL${NC}"
    echo "Make sure your Next.js dev server is running with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ API is accessible${NC}"
echo ""

# Initialize HTML report
cat > "$OUTPUT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coaching Notifications - 7-Day Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .summary {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .day-result {
            margin: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .day-header {
            padding: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .day-header.sent {
            background: #d4edda;
            color: #155724;
            border-bottom: 1px solid #c3e6cb;
        }
        .day-header.not-sent {
            background: #f8d7da;
            color: #721c24;
            border-bottom: 1px solid #f5c6cb;
        }
        .day-content {
            padding: 20px;
        }
        .message-preview {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #007bff;
        }
        .message-meta {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 10px;
        }
        .reasoning {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
            margin: 10px 0;
        }
        .confidence-score {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .confidence-high { background: #d4edda; color: #155724; }
        .confidence-medium { background: #fff3cd; color: #856404; }
        .confidence-low { background: #f8d7da; color: #721c24; }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #e9ecef;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Coaching Notifications Test Report</h1>
            <p>7-Day Simulation Analysis</p>
        </div>
EOF

# Add test info to HTML
cat >> "$OUTPUT_FILE" << EOF
        <div class="summary">
            <h2>Test Configuration</h2>
            <p><strong>User ID:</strong> $USER_ID</p>
            <p><strong>API Endpoint:</strong> $API_BASE_URL/api/prototype/coaching-message-evaluator</p>
            <p><strong>Test Date:</strong> $(date)</p>
            <p><strong>Time Range:</strong> Past 7 days ($(date -v-7d '+%Y-%m-%d') to $(date '+%Y-%m-%d'))</p>
        </div>
EOF

# Initialize counters for summary
total_days=0
messages_sent=0
messages_not_sent=0
total_confidence=0
confidence_count=0

echo -e "${YELLOW}🧪 Running 7-day test simulation...${NC}"
echo ""

# Test each of the past 7 days
for i in {6..0}; do
    # Calculate date for this iteration (i days ago) - macOS compatible
    test_date=$(date -v-${i}d -u '+%Y-%m-%dT%H:%M:%S.000Z')
    readable_date=$(date -v-${i}d '+%A, %B %d, %Y at %I:%M %p')
    
    echo -e "${BLUE}📅 Testing day $((7-i))/7: $readable_date${NC}"
    
    # Make API call
    echo "   Making API request..."
    response=$(curl -s -X POST "$API_BASE_URL/api/prototype/coaching-message-evaluator" \
        -H "Content-Type: application/json" \
        -d "{\"userId\":\"$USER_ID\",\"simulatedDate\":\"$test_date\"}" \
        || echo '{"error":"curl_failed"}')
    
    # Check if request was successful
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}   ❌ API Error: $(echo "$response" | jq -r '.error // .details // "Unknown error"')${NC}"
        
        # Add error to HTML
        cat >> "$OUTPUT_FILE" << EOF
        <div class="day-result">
            <div class="day-header not-sent">
                <span>$readable_date</span>
                <span>❌ API ERROR</span>
            </div>
            <div class="day-content">
                <div class="error">
                    <strong>Error:</strong> $(echo "$response" | jq -r '.error // "Unknown error"')<br>
                    <strong>Details:</strong> $(echo "$response" | jq -r '.details // "No details available"')
                </div>
            </div>
        </div>
EOF
        continue
    fi
    
    # Parse response
    should_send=$(echo "$response" | jq -r '.shouldSend')
    reasoning=$(echo "$response" | jq -r '.reasoning // "No reasoning provided"')
    
    total_days=$((total_days + 1))
    
    # Add day result to HTML
    if [ "$should_send" = "true" ]; then
        echo -e "${GREEN}   ✅ Message would be sent${NC}"
        messages_sent=$((messages_sent + 1))
        
        # Extract message details
        message_type=$(echo "$response" | jq -r '.message.messageType // "unknown"')
        push_text=$(echo "$response" | jq -r '.message.pushNotificationText // "N/A"')
        full_message=$(echo "$response" | jq -r '.message.fullMessage // "N/A"')
        confidence=$(echo "$response" | jq -r '.message.aiMetadata.confidenceScore // 0')
        
        # Escape for HTML and handle special characters
        push_text_escaped=$(echo "$push_text" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        full_message_escaped=$(echo "$full_message" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        reasoning_escaped=$(echo "$reasoning" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        
        # Calculate confidence class
        confidence_class="confidence-low"
        if (( $(echo "$confidence > 0.7" | bc -l) )); then
            confidence_class="confidence-high"
        elif (( $(echo "$confidence > 0.5" | bc -l) )); then
            confidence_class="confidence-medium"
        fi
        
        total_confidence=$(echo "$total_confidence + $confidence" | bc -l)
        confidence_count=$((confidence_count + 1))
        
        cat >> "$OUTPUT_FILE" << EOF
        <div class="day-result">
            <div class="day-header sent">
                <span>$readable_date</span>
                <span>✅ MESSAGE SENT</span>
            </div>
            <div class="day-content">
                <div class="message-meta">
                    <strong>Type:</strong> <span class="code">$message_type</span> | 
                    <strong>Confidence:</strong> <span class="confidence-score $confidence_class">$(printf "%.0f%%" $(echo "$confidence * 100" | bc -l))</span>
                </div>
                <div class="message-preview">
                    <strong>📱 Push Notification:</strong><br>
                    "$push_text_escaped"
                </div>
                <div class="message-preview">
                    <strong>💬 Full Message:</strong><br>
                    "$full_message_escaped"
                </div>
                <div class="reasoning">
                    <strong>🧠 AI Reasoning:</strong><br>
                    $reasoning_escaped
                </div>
            </div>
        </div>
EOF
    else
        echo -e "${YELLOW}   ⏸ Message would NOT be sent${NC}"
        messages_not_sent=$((messages_not_sent + 1))
        
        # Escape reasoning for HTML
        reasoning_escaped=$(echo "$reasoning" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
        
        cat >> "$OUTPUT_FILE" << EOF
        <div class="day-result">
            <div class="day-header not-sent">
                <span>$readable_date</span>
                <span>⏸ NO MESSAGE</span>
            </div>
            <div class="day-content">
                <div class="reasoning">
                    <strong>🧠 AI Reasoning:</strong><br>
                    $reasoning_escaped
                </div>
            </div>
        </div>
EOF
    fi
    
    echo "   $(echo "$reasoning" | head -c 80)..."
    echo ""
done

# Calculate average confidence
avg_confidence="0"
if [ $confidence_count -gt 0 ]; then
    avg_confidence=$(echo "scale=2; $total_confidence / $confidence_count" | bc -l)
fi

# Add summary statistics to HTML
cat >> "$OUTPUT_FILE" << EOF
        <div class="summary">
            <h2>📊 Test Results Summary</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">$total_days</div>
                    <div>Days Tested</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$messages_sent</div>
                    <div>Messages Sent</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$messages_not_sent</div>
                    <div>Messages Skipped</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$(printf "%.0f%%" $(echo "$avg_confidence * 100" | bc -l))</div>
                    <div>Avg Confidence</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
EOF

echo "=================================================="
echo -e "${GREEN}✅ 7-day test completed!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "   Total days tested: $total_days"
echo "   Messages that would be sent: $messages_sent"
echo "   Messages that would be skipped: $messages_not_sent"
if [ $confidence_count -gt 0 ]; then
    echo "   Average confidence: $(printf "%.1f%%" $(echo "$avg_confidence * 100" | bc -l))"
fi
echo ""
echo -e "${BLUE}📄 HTML Report generated: ${YELLOW}$OUTPUT_FILE${NC}"
echo "   Open it in your browser to see detailed results"
echo ""

# Try to open the HTML file automatically
if command -v open &> /dev/null; then
    echo -e "${YELLOW}🚀 Opening report in browser...${NC}"
    open "$OUTPUT_FILE"
elif command -v xdg-open &> /dev/null; then
    echo -e "${YELLOW}🚀 Opening report in browser...${NC}"
    xdg-open "$OUTPUT_FILE"
else
    echo "Manually open $OUTPUT_FILE in your browser to view the report"
fi 