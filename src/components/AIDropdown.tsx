'use client';

import { useState, useEffect, useRef } from 'react';

interface AIDropdownProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (suggestion: string) => void;
}

const mockSuggestions = [
  "Expand on this idea",
  "Ask a follow-up question", 
  "Summarize key points",
  "Add supporting details",
  "Consider alternative perspectives",
  "Connect to personal experience",
  "Explore implications",
  "Break down into steps"
];

export default function AIDropdown({ isVisible, position, onClose, onSelect }: AIDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset selected index when dropdown becomes visible
  useEffect(() => {
    if (isVisible) {
      setSelectedIndex(0);
    }
  }, [isVisible]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % mockSuggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? mockSuggestions.length - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(mockSuggestions[selectedIndex]);
          onClose();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, onSelect, onClose]);

  // Handle click outside to close
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-2 min-w-[200px] max-w-[300px] animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {mockSuggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
            index === selectedIndex
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750'
          }`}
          onClick={() => {
            onSelect(suggestion);
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}