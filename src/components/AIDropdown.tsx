'use client';

import { useState, useEffect, useRef } from 'react';

export type AIMode = 'dive-deeper' | 'reflect-back' | 'scrutinize-thinking';

interface AIDropdownProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (mode: AIMode) => void;
}

const aiModes: { id: AIMode; label: string; description: string }[] = [
  {
    id: 'dive-deeper',
    label: 'Dive Deeper',
    description: 'Explore and expand your ideas'
  },
  {
    id: 'reflect-back',
    label: 'Reflect Back',
    description: 'Get thoughtful insights and reflections'
  },
  {
    id: 'scrutinize-thinking',
    label: 'Scrutinize Thinking',
    description: 'Challenge and strengthen your reasoning'
  }
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
          setSelectedIndex(prev => (prev + 1) % aiModes.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? aiModes.length - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(aiModes[selectedIndex].id);
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
      {aiModes.map((mode, index) => (
        <div
          key={mode.id}
          className={`px-4 py-3 cursor-pointer transition-colors ${
            index === selectedIndex
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750'
          }`}
          onClick={() => {
            onSelect(mode.id);
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="font-medium text-sm">{mode.label}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {mode.description}
          </div>
        </div>
      ))}
    </div>
  );
}