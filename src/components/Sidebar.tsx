'use client';

import { RefObject, useState } from 'react';
import { formatDate, countWords, calculateLineWidth, getPreviewText } from '../utils/formatters';
import { JournalEntry } from '../types/journal';

interface SidebarProps {
  entries: Record<string, JournalEntry[]>;
  selectedEntryId: string | null;
  sidebarRef: RefObject<HTMLDivElement | null>;
  entryRefs: RefObject<{ [key: string]: HTMLDivElement | null }>;
  onSelectEntry: (entryId: string) => void;
}

export default function Sidebar({
  entries,
  selectedEntryId,
  sidebarRef,
  entryRefs,
  onSelectEntry
}: SidebarProps) {
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  // Generate dates for the sidebar - show dates that have entries plus today (descending order)
  const generateDates = () => {
    const dates = new Set<string>();
    const today = new Date();
    const todayKey = formatDate(today);
    
    // Add today
    dates.add(todayKey);
    
    // Add all dates that have entries
    Object.keys(entries).forEach(dateKey => {
      if (entries[dateKey].length > 0) {
        dates.add(dateKey);
      }
    });
    
    // Convert to Date objects and sort descending (newest first)
    return Array.from(dates)
      .map(dateKey => new Date(dateKey))
      .sort((a, b) => b.getTime() - a.getTime());
  };

  const dates = generateDates();

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Scrollable content area */}
      <div 
        ref={sidebarRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ 
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* Internet Explorer 10+ */
        }}
      >
        <div className="relative">
          {/* Dynamic top spacer */}
          <div style={{ height: 'calc(100vh - 200px)' }}></div>
          
          <div className="px-6 space-y-4">
            {dates.map((date) => {
              const dateKey = formatDate(date);
              const dayEntries = entries[dateKey] || [];
              const sortedDayEntries = [...dayEntries].sort((a, b) => 
                b.timestamp.getTime() - a.timestamp.getTime()
              );
              
              const today = new Date();
              
              if (dayEntries.length === 0 && dateKey !== formatDate(today)) {
                return null; // Don't show empty days except today
              }
              
              return (
                <div key={dateKey} className="space-y-2">
                  {/* Day separator - red line with date for every day */}
                  <div className="ml-3 mb-2 mt-6">
                    <div className="px-3 py-1.5">
                      <div className="flex items-center justify-between gap-2 min-h-[20px]">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 flex justify-end">
                          <div className="w-5 h-[3px] bg-red-500 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Entries for this day */}
                  <div className="ml-3 space-y-px">
                    {sortedDayEntries.map((entry) => {
                      const isSelected = selectedEntryId === entry.id;
                      const wordCount = countWords(entry.content);
                      const lineWidth = calculateLineWidth(wordCount);
                      const previewText = getPreviewText(entry.content);
                      const isHovered = hoveredEntryId === entry.id;
                      
                      return (
                        <div
                          key={entry.id}
                          ref={(el) => {
                            if (entryRefs.current) {
                              entryRefs.current[entry.id] = el;
                            }
                          }}
                          className={`group relative cursor-pointer py-1.5 px-3 rounded transition-colors duration-200 ${
                            isSelected 
                              ? 'text-black dark:text-white' 
                              : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
                          }`}
                          onClick={() => onSelectEntry(entry.id)}
                          onMouseEnter={() => setHoveredEntryId(entry.id)}
                          onMouseLeave={() => setHoveredEntryId(null)}
                        >
                          <div className="flex items-center justify-between gap-2 min-h-[20px]">
                            {/* Always show only line indicator, right-aligned */}
                            <div className="flex-1 flex justify-end">
                              <div 
                                className={`h-[2px] transition-all duration-200 ${
                                  isSelected ? 'bg-neutral-600 dark:bg-neutral-300' : 'bg-neutral-300 dark:bg-neutral-600'
                                }`}
                                style={{ width: `${lineWidth}px` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Tooltip */}
                          {isHovered && (
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 z-50 px-2 py-1 bg-neutral-800 dark:bg-neutral-700 text-white text-xs rounded shadow-lg whitespace-nowrap max-w-sm"
                              style={{ right: `calc(${lineWidth}px + 18px)` }}
                            >
                              {previewText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show "No entries" for today if empty */}
                    {dayEntries.length === 0 && dateKey === formatDate(today) && (
                      <div className="text-xs text-neutral-400 ml-3 py-1">
                        No entries yet
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Dynamic bottom spacer */}
          <div style={{ height: 'calc(100vh - 200px)' }}></div>
        </div>
      </div>
    </div>
  );
}