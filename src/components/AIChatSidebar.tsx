'use client';

import { useState, useRef, useEffect } from 'react';
import { AIMode } from './AIDropdown';
import ChatInterface from './ChatInterface';

interface AIChatSidebarProps {
  isOpen: boolean;
  mode: AIMode | null;
  context: string;
  onClose: () => void;
}

const modeLabels = {
  'dive-deeper': 'Dive Deeper',
  'reflect-back': 'Reflect Back',
  'scrutinize-thinking': 'Scrutinize Thinking'
};

export default function AIChatSidebar({ isOpen, mode, context, onClose }: AIChatSidebarProps) {
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close sidebar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = 600;
      
      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  if (!isOpen || !mode) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 z-50 flex flex-col"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          ref={resizeRef}
          className="absolute -left-1 top-0 w-2 h-full cursor-col-resize hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors hidden md:block"
          onMouseDown={() => setIsResizing(true)}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <div>
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                {modeLabels[mode]}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                AI Assistant
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg
              className="w-4 h-4 text-neutral-500 dark:text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            mode={mode}
            context={context}
            autoFocus={isOpen}
          />
        </div>
      </div>
    </>
  );
}