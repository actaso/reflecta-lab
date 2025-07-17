/**
 * Generic XML Streaming Parser
 * Handles character-by-character parsing of streaming XML data
 * 
 * This is a reusable utility that can parse any streaming XML format,
 * not just coaching-specific responses.
 */

export interface XMLStreamingParserEvents {
  thinking: (data: { text: string }) => void;
  metadata: (data: Record<string, unknown>) => void;
  content: (data: { text: string }) => void;
  done: () => void;
  fallback: (data: { fullResponse: string }) => void;
  error: (data: { error: string }) => void;
}

export class XMLStreamingParser {
  private currentTag = '';
  private tagContent = '';
  private inTag = false;
  private parsedData: Record<string, unknown> = {};
  private contentBuffer = '';
  private thinkingBuffer = '';
  private metadataSent = false;
  private fullResponse = '';
  private streamEnded = false;

  constructor(private events: XMLStreamingParserEvents) {}

  /**
   * Processes accumulated content in a completed XML tag
   */
  private processCompletedTag(tagName: string, content: string) {
    const trimmedContent = content.trim();
    
    // Store parsed data for metadata
    if (tagName === 'variant') {
      this.parsedData.variant = trimmedContent;
    } else if (tagName === 'option') {
      if (!this.parsedData.options) {
        this.parsedData.options = [];
      }
      if (trimmedContent && Array.isArray(this.parsedData.options)) {
        this.parsedData.options.push(trimmedContent);
      }
    } else if (tagName === 'content') {
      // Content is streamed in real-time, no processing needed here
    } else if (tagName === 'thinking') {
      // Thinking is streamed in real-time, no processing needed here
    } else {
      // Generic tag storage
      this.parsedData[tagName] = trimmedContent;
    }
    
    // Send metadata once we have variant (and other metadata)
    if (this.parsedData.variant && !this.metadataSent) {
      this.events.metadata(this.parsedData);
      this.metadataSent = true;
    }
  }

  /**
   * Processes streaming content within <content> tags
   */
  private processContentChunk(chunk: string) {
    // Remove closing tag if present
    const cleanChunk = chunk.replace('</content>', '');
    if (cleanChunk) {
      this.contentBuffer += cleanChunk;
      this.events.content({ text: cleanChunk });
    }
  }

  /**
   * Processes streaming content within <thinking> tags
   */
  private processThinkingChunk(chunk: string) {
    // Remove closing tag if present
    const cleanChunk = chunk.replace('</thinking>', '');
    if (cleanChunk) {
      this.thinkingBuffer += cleanChunk;
      this.events.thinking({ text: cleanChunk });
    }
  }

  /**
   * Process a chunk of streaming content
   */
  processChunk(content: string) {
    if (!content) return;
    
    this.fullResponse += content;
    
    // Process character by character for XML parsing
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '<') {
        // Start of a tag
        if (this.inTag && (this.currentTag === 'content' || this.currentTag === 'thinking')) {
          // We're in content/thinking and hit a new tag (likely closing tag)
          // Process any remaining content
          if (this.tagContent) {
            if (this.currentTag === 'content') {
              this.processContentChunk(this.tagContent);
            } else if (this.currentTag === 'thinking') {
              this.processThinkingChunk(this.tagContent);
            }
          }
        }
        
        this.inTag = true;
        this.currentTag = '';
        this.tagContent = '';
      } else if (char === '>' && this.inTag) {
        // End of tag
        this.inTag = false;
        
        if (this.currentTag.startsWith('/')) {
          // Closing tag
          const tagName = this.currentTag.substring(1);
          this.processCompletedTag(tagName, this.tagContent);
          
          if (tagName === 'content') {
            // Content section is complete
            this.endStreamOnce();
            return;
          }
        } else {
          // Opening tag
          if (this.currentTag === 'content' || this.currentTag === 'thinking') {
            // Start streaming content or thinking
            this.tagContent = '';
          }
        }
      } else if (this.inTag) {
        // Building tag name
        this.currentTag += char;
      } else {
        // Content inside tag
        this.tagContent += char;
        
        // If we're in content or thinking tag, stream it immediately
        if (this.currentTag === 'content') {
          this.processContentChunk(char);
        } else if (this.currentTag === 'thinking') {
          this.processThinkingChunk(char);
        }
      }
    }
  }

  /**
   * End stream only once to prevent controller close errors
   */
  private endStreamOnce() {
    if (this.streamEnded) return;
    this.streamEnded = true;
    this.events.done();
  }

  /**
   * Handle end of stream
   */
  endStream() {
    if (this.streamEnded) return;
    
    // Stream ended - send whatever we have
    if (this.contentBuffer || this.thinkingBuffer || this.parsedData.variant) {
      if (!this.metadataSent && this.parsedData.variant) {
        this.events.metadata(this.parsedData);
      }
      this.endStreamOnce();
    } else {
      // Fallback - try to parse as complete XML
      this.streamEnded = true;
      this.events.fallback({ fullResponse: this.fullResponse });
    }
  }

  /**
   * Handle parsing error
   */
  handleError(error: Error) {
    if (this.streamEnded) return;
    
    console.error('XML Streaming Parser error:', error);
    this.streamEnded = true;
    this.events.error({ error: 'Stream processing failed' });
  }
}