'use client';

import React, { useState, useEffect, useRef } from 'react';
import { stripHtml, formatDisplayDate, formatTime } from '../utils/formatters';

type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Record<string, JournalEntry[]>;
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onQuickCapture: () => void;
}

interface SearchResult {
  entry: JournalEntry;
  dateKey: string;
  matchType: 'content' | 'date';
  preview: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  entries,
  selectedEntryId,
  onSelectEntry,
  onQuickCapture,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const searchEntries = (searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    Object.keys(entries).forEach(dateKey => {
      const dayEntries = entries[dateKey] || [];
      
      dayEntries.forEach(entry => {
        const content = stripHtml(entry.content).toLowerCase();
        const displayDate = formatDisplayDate(entry.timestamp).toLowerCase();
        const timeStr = formatTime(entry.timestamp).toLowerCase();
        
        if (content.includes(lowerQuery)) {
          const preview = stripHtml(entry.content).substring(0, 60) + '...';
          results.push({
            entry,
            dateKey,
            matchType: 'content',
            preview: preview || 'Empty entry'
          });
        }
        else if (displayDate.includes(lowerQuery) || timeStr.includes(lowerQuery)) {
          const preview = stripHtml(entry.content).substring(0, 60) + '...';
          results.push({
            entry,
            dateKey,
            matchType: 'date',
            preview: preview || 'Empty entry'
          });
        }
      });
    });

    return results.sort((a, b) => {
      const aContent = stripHtml(a.entry.content).toLowerCase();
      const bContent = stripHtml(b.entry.content).toLowerCase();
      
      const aExact = aContent.startsWith(lowerQuery);
      const bExact = bContent.startsWith(lowerQuery);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return b.entry.timestamp.getTime() - a.entry.timestamp.getTime();
    }).slice(0, 10); // Limit to 10 results
  };

  const searchResults = searchEntries(query);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const hasQuickCapture = query.trim() === '';
      const totalOptions = hasQuickCapture ? 1 : searchResults.length;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < totalOptions - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : totalOptions - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (hasQuickCapture && selectedIndex === 0) {
            onQuickCapture();
            onClose();
          } else if (searchResults[selectedIndex]) {
            onSelectEntry(searchResults[selectedIndex].entry.id);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onSelectEntry, onClose, onQuickCapture, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, searchResults.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 pt-[20vh]">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-700 px-4">
          <svg
            className="w-5 h-5 text-neutral-400 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search journal entries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 py-4 bg-transparent border-none outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs font-mono">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div 
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
        >
          {query.trim() === '' ? (
            <div className="py-2">
              <div
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  selectedIndex === 0
                    ? 'bg-neutral-100 dark:bg-neutral-700'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-750'
                }`}
                onClick={() => {
                  onQuickCapture();
                  onClose();
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Quick Capture
                      </span>
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        New entry
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">
                      Create a new journal entry without leaving this page
                    </div>
                  </div>
                  {selectedIndex === 0 && (
                    <div className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                      ↵
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
                <div className="text-sm">Start typing to search your journal entries</div>
                <div className="text-xs mt-2 text-neutral-400 dark:text-neutral-500">
                  Search by content or date
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
              <div className="text-sm">No entries found</div>
              <div className="text-xs mt-2 text-neutral-400 dark:text-neutral-500">
                Try a different search term
              </div>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <div
                  key={result.entry.id}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-neutral-100 dark:bg-neutral-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-750'
                  } ${
                    result.entry.id === selectedEntryId
                      ? 'border-l-2 border-blue-500'
                      : ''
                  }`}
                  onClick={() => {
                    onSelectEntry(result.entry.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {formatDisplayDate(result.entry.timestamp)}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatTime(result.entry.timestamp)}
                        </span>
                        {result.matchType === 'date' && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Date match
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-300 truncate">
                        {result.preview}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <div className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                        ↵
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <div>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-4">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
