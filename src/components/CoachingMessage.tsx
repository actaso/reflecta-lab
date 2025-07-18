'use client';

import ReactMarkdown from 'react-markdown';
import MeditationCard from './cards/MeditationCard';
import FocusCard from './cards/FocusCard';
import BlockersCard from './cards/BlockersCard';
import ActionPlanCard from './cards/ActionPlanCard';
import CheckInCard from './cards/CheckInCard';

interface CoachingMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CoachingMessageProps {
  message: CoachingMessageData;
}

// Function to parse component markers in content
function parseUIComponents(content: string) {
  const components: Array<{ type: 'text' | 'component'; content: string; props?: Record<string, string | number> }> = [];
  
  // Regex to match component markers like [meditation:title="...",duration="...",description="..."]
  const componentRegex = /\[(\w+):([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = componentRegex.exec(content)) !== null) {
    // Add text before the component
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        components.push({ type: 'text', content: textContent });
      }
    }
    
    // Parse component
    const componentType = match[1];
    const propsString = match[2];
    
    // Parse props from the string (simple key="value" parser)
    const props: Record<string, string | number> = {};
    const propRegex = /(\w+)="([^"]+)"/g;
    let propMatch;
    
    while ((propMatch = propRegex.exec(propsString)) !== null) {
      const [, key, value] = propMatch;
      // Convert duration to number if it's a numeric value
      if (key === 'duration' && !isNaN(Number(value))) {
        props[key] = Number(value);
      } else {
        props[key] = value;
      }
    }
    
    components.push({ type: 'component', content: componentType, props });
    lastIndex = componentRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      components.push({ type: 'text', content: textContent });
    }
  }
  
  // If no components found, return the original content as text
  if (components.length === 0) {
    components.push({ type: 'text', content });
  }
  
  return components;
}

// Function to render a UI component based on type and props
function renderUIComponent(type: string, props: Record<string, string | number>) {
  switch (type) {
    case 'meditation':
      return (
        <MeditationCard
          title={String(props.title || 'Guided Meditation')}
          duration={Number(props.duration || 300)}
          description={props.description ? String(props.description) : undefined}
          type={(props.type as 'breathing' | 'mindfulness' | 'body-scan') || 'breathing'}
        />
      );
    case 'focus':
      return (
        <FocusCard
          focus={String(props.focus || 'Main focus not specified')}
          context={props.context ? String(props.context) : undefined}
        />
      );
    case 'blockers':
      const blockers = props.items ? String(props.items).split('|').map((item: string) => item.trim()) : [];
      return (
        <BlockersCard
          blockers={blockers}
          title={props.title ? String(props.title) : undefined}
        />
      );
    case 'actions':
      const actions = props.items ? String(props.items).split('|').map((item: string) => item.trim()) : [];
      return (
        <ActionPlanCard
          actions={actions}
          title={props.title ? String(props.title) : undefined}
        />
      );
    case 'checkin':
      return (
        <CheckInCard
          frequency={String(props.frequency || 'once a day')}
          what={props.what ? String(props.what) : undefined}
          notes={props.notes ? String(props.notes) : undefined}
        />
      );
    default:
      return <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-600">Unknown component: {type}</div>;
  }
}

export default function CoachingMessage({ message }: CoachingMessageProps) {
  const isUser = message.role === 'user';
  
  if (isUser) {
    return (
      <div className="mb-8 text-right">
        <div className="inline-block max-w-[85%] ml-auto">
          <div className="px-0 py-2 text-base leading-relaxed text-neutral-700 font-medium">
            {message.content}
          </div>
        </div>
      </div>
    );
  }
  
  // Parse content for UI components
  const parsedComponents = parseUIComponents(message.content);
  
  return (
    <div className="mb-8 text-left">
      <div className="inline-block max-w-[85%] mr-auto">
        <div className="px-0 py-2 text-base leading-relaxed text-neutral-600">
          {parsedComponents.map((component, index) => (
            <div key={index}>
              {component.type === 'text' ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-neutral-700">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-neutral-600">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-neutral-200 pl-4 italic text-neutral-500 my-3">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {component.content}
                </ReactMarkdown>
              ) : (
                renderUIComponent(component.content, component.props || {})
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 