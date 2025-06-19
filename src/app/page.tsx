'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '../components/Editor';

type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

export default function JournalApp() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, JournalEntry[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load entries from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('journal-entries');
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        // Convert timestamp strings back to Date objects
        const entriesWithDates: Record<string, JournalEntry[]> = {};
        Object.keys(parsed).forEach(dateKey => {
          entriesWithDates[dateKey] = parsed[dateKey].map((entry: {id: string; timestamp: string; content: string}) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
        });
        setEntries(entriesWithDates);
      } catch (error) {
        console.error('Failed to load entries from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('journal-entries', JSON.stringify(entries));
    }
  }, [entries, isLoaded]);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

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

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Strip HTML tags and return clean text for preview
  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Get all entries sorted by date and time (newest first)
  const getAllEntriesChronological = useCallback(() => {
    const allEntries: Array<{ entry: JournalEntry; dateKey: string }> = [];
    
    Object.keys(entries).forEach(dateKey => {
      const dayEntries = entries[dateKey] || [];
      // Sort entries for this day by timestamp (newest first)
      const sortedDayEntries = [...dayEntries].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      sortedDayEntries.forEach(entry => {
        allEntries.push({ entry, dateKey });
      });
    });
    
    // Sort all entries by date and time (newest first)
    return allEntries.sort((a, b) => {
      const dateA = new Date(a.dateKey + 'T' + a.entry.timestamp.toTimeString());
      const dateB = new Date(b.dateKey + 'T' + b.entry.timestamp.toTimeString());
      return dateB.getTime() - dateA.getTime();
    });
  }, [entries]);

  // Get the current selected entry
  const getCurrentEntry = () => {
    if (!selectedEntryId) return null;
    
    for (const dateKey of Object.keys(entries)) {
      const dayEntries = entries[dateKey] || [];
      const entry = dayEntries.find(e => e.id === selectedEntryId);
      if (entry) return { entry, dateKey };
    }
    return null;
  };

  const handleEntryChange = (value: string) => {
    if (!selectedEntryId) return;
    
    setEntries(prev => {
      const newEntries = { ...prev };
      
      // Find and update the entry
      for (const dateKey of Object.keys(newEntries)) {
        const dayEntries = newEntries[dateKey] || [];
        const entryIndex = dayEntries.findIndex(e => e.id === selectedEntryId);
        if (entryIndex !== -1) {
          newEntries[dateKey] = [...dayEntries];
          newEntries[dateKey][entryIndex] = {
            ...dayEntries[entryIndex],
            content: value
          };
          break;
        }
      }
      
      return newEntries;
    });
  };

  const createNewEntry = useCallback(() => {
    const now = new Date();
    const todayKey = formatDate(now);
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      timestamp: now,
      content: ''
    };
    
    setEntries(prev => ({
      ...prev,
      [todayKey]: [newEntry, ...(prev[todayKey] || [])]
    }));
    
    setSelectedEntryId(newEntry.id);
    
    // Auto-scroll to the new entry after a brief delay
    setTimeout(() => {
      const entryElement = entryRefs.current[newEntry.id];
      const sidebar = sidebarRef.current;
      
      if (entryElement && sidebar) {
        // Calculate the position to center the new entry in the trigger zone
        const sidebarRect = sidebar.getBoundingClientRect();
        const triggerPoint = sidebarRect.height / 3;
        
        // Scroll to position the entry at the trigger point
        const targetScrollTop = entryElement.offsetTop - triggerPoint;
        sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const deleteEntry = (entryId: string) => {
    setEntries(prev => {
      const newEntries = { ...prev };
      
      // Find and remove the entry
      for (const dateKey of Object.keys(newEntries)) {
        const dayEntries = newEntries[dateKey] || [];
        const entryIndex = dayEntries.findIndex(e => e.id === entryId);
        if (entryIndex !== -1) {
          newEntries[dateKey] = dayEntries.filter(e => e.id !== entryId);
          
          // If this was the selected entry, select another one
          if (selectedEntryId === entryId) {
            const allEntries = getAllEntriesChronological();
            const remainingEntries = allEntries.filter(({ entry }) => entry.id !== entryId);
            setSelectedEntryId(remainingEntries.length > 0 ? remainingEntries[0].entry.id : null);
          }
          break;
        }
      }
      
      return newEntries;
    });
  };

  // Initialize with the first entry and set initial scroll position
  useEffect(() => {
    if (isLoaded && !selectedEntryId) {
      const allEntries = getAllEntriesChronological();
      if (allEntries.length > 0) {
        setSelectedEntryId(allEntries[0].entry.id);
        
        // Set initial scroll position to show the first entry in the trigger zone
        // Use multiple animation frames to ensure everything is fully rendered
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const sidebar = sidebarRef.current;
              const firstEntryElement = entryRefs.current[allEntries[0].entry.id];
              
              if (sidebar && firstEntryElement) {
                // Double-check that the element has been rendered
                if (firstEntryElement.offsetHeight > 0) {
                  const sidebarHeight = sidebar.clientHeight;
                  const triggerPoint = sidebarHeight / 3;
                  const targetScrollTop = firstEntryElement.offsetTop - triggerPoint;
                  sidebar.scrollTo({ top: targetScrollTop, behavior: 'auto' });
                }
              }
            });
          });
        }, 150);
      }
    }
  }, [selectedEntryId, getAllEntriesChronological, isLoaded]);

  // Scroll-hijacking: Auto-select entry based on scroll position in sidebar
  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current) return;

      const sidebar = sidebarRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const triggerPoint = sidebarRect.top + sidebarRect.height / 3;
      
      let closestEntryId = null;
      let closestDistance = Infinity;
      
      const allEntries = getAllEntriesChronological();
      if (allEntries.length === 0) return;

      // Simple approach: find the entry closest to the trigger point
      for (const { entry } of allEntries) {
        const element = entryRefs.current[entry.id];
        
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const elementCenter = elementRect.top + elementRect.height / 2;
          const distance = Math.abs(elementCenter - triggerPoint);
          
          // Keep track of the closest element
          if (distance < closestDistance) {
            closestDistance = distance;
            closestEntryId = entry.id;
          }
        }
      }

      // Update selected entry if we found one and it's different
      if (closestEntryId && selectedEntryId !== closestEntryId) {
        setSelectedEntryId(closestEntryId);
      }
    };

    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial call to set the first entry
      setTimeout(() => handleScroll(), 100);
      
      return () => sidebar.removeEventListener('scroll', handleScroll);
    }
  }, [selectedEntryId, getAllEntriesChronological]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CMD+Enter to create new entry
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        createNewEntry();
        return;
      }

      // CMD+Up/Down to navigate through entries
      if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        
        const allEntries = getAllEntriesChronological();
        if (allEntries.length === 0) return;

        let currentIndex = selectedEntryId 
          ? allEntries.findIndex(({ entry }) => entry.id === selectedEntryId)
          : -1;

        if (event.key === 'ArrowUp') {
          // Move to previous entry (newer)
          currentIndex = currentIndex <= 0 ? allEntries.length - 1 : currentIndex - 1;
        } else {
          // Move to next entry (older)
          currentIndex = currentIndex >= allEntries.length - 1 ? 0 : currentIndex + 1;
        }

        const newSelectedEntry = allEntries[currentIndex];
        if (newSelectedEntry) {
          setSelectedEntryId(newSelectedEntry.entry.id);
          
          // Scroll to the selected entry
          setTimeout(() => {
            const entryElement = entryRefs.current[newSelectedEntry.entry.id];
            const sidebar = sidebarRef.current;
            
            if (entryElement && sidebar) {
              const sidebarRect = sidebar.getBoundingClientRect();
              const triggerPoint = sidebarRect.height / 3;
              const targetScrollTop = entryElement.offsetTop - triggerPoint;
              sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
          }, 50);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntryId, createNewEntry, getAllEntriesChronological]);

  const currentEntry = getCurrentEntry();

  return (
    <div className="flex h-screen bg-neutral-50 font-[family-name:var(--font-geist-sans)]">
      {/* Left Sidebar - Entry navigation with fixed indicator */}
      <div className="w-64 bg-neutral-50 flex flex-col relative">
        {/* Fixed selection indicator - truly fixed, won't scroll */}
        <div 
          className="absolute right-0 pointer-events-none z-10"
          style={{ top: 'calc(33.333% - 4px)' }}
        >
          <div className="w-1 h-8 bg-gradient-to-b from-transparent via-orange-400 to-transparent opacity-60"></div>
        </div>
        
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
                    {/* Date header with entry count indicators */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-medium text-neutral-700">
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      {/* Visual indicators - small vertical lines */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(dayEntries.length, 5) }).map((_, i) => (
                          <div key={i} className="w-[2px] h-3 bg-neutral-400"></div>
                        ))}
                        {dayEntries.length > 5 && (
                          <div className="text-xs text-neutral-400 ml-1">+{dayEntries.length - 5}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Entries for this day */}
                    <div className="ml-3 space-y-1">
                      {sortedDayEntries.map((entry) => {
                        const isSelected = selectedEntryId === entry.id;
                        return (
                          <div
                            key={entry.id}
                            ref={(el) => {
                              entryRefs.current[entry.id] = el;
                            }}
                            className={`group relative cursor-pointer py-1.5 px-3 rounded transition-colors duration-200 ${
                              isSelected 
                                ? 'text-black' 
                                : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                            onClick={() => setSelectedEntryId(entry.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm leading-relaxed line-clamp-1 flex-1">
                                {stripHtml(entry.content) || 'Empty entry'}
                              </div>
                              {/* Delete button - subtle gray, appears on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(entry.id);
                                }}
                                className="flex-shrink-0 w-4 h-4 text-neutral-300 hover:text-neutral-500 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Delete entry"
                              >
                                ×
                              </button>
                            </div>
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

      {/* Main Content Area */}
      <div className="flex-1 bg-neutral-50 flex flex-col">
        {/* Header with entry info and + button */}
        <div className="pt-8 px-8 pb-4 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-base text-black font-normal">
              {currentEntry ? formatDisplayDate(new Date(currentEntry.dateKey)) : 'Select an entry'}
            </h1>
            <div className="ml-3 w-6 h-[2px] bg-orange-500"></div>
            {currentEntry && (
              <div className="ml-4 text-sm text-neutral-500">
                {formatTime(currentEntry.entry.timestamp)}
              </div>
            )}
          </div>
          
          {/* ? Button for help */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-300 transition-colors"
            title="Show shortcuts"
          >
            <span className="text-lg leading-none">?</span>
          </button>
        </div>
        
        {/* Writing area */}
        <div className="flex-1 px-8 pb-8 relative">
          {currentEntry ? (
            <Editor
              content={currentEntry.entry.content}
              onChange={handleEntryChange}
              placeholder="Start writing, press ? for help..."
              autoFocus={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              <div className="text-center">
                <div className="text-lg mb-2">Welcome to your journal</div>
                <div className="text-sm">Press Cmd+Enter to create your first entry</div>
              </div>
            </div>
          )}
          
          {/* Help Modal */}
          {showHelp && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-black">Keyboard Shortcuts</h3>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="text-neutral-400 hover:text-neutral-600 text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Create new entry</span>
                    <kbd className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono">Cmd+Enter</kbd>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Navigate to newer entry</span>
                    <kbd className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono">Cmd+↑</kbd>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Navigate to older entry</span>
                    <kbd className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono">Cmd+↓</kbd>
                  </div>
                  
                  <div className="border-t border-neutral-200 pt-3 mt-4">
                    <div className="text-neutral-600 mb-2">Markdown Support:</div>
                    <div className="space-y-1 text-xs text-neutral-500">
                      <div><code># Heading</code> for headers</div>
                      <div><code>**bold**</code> and <code>*italic*</code></div>
                      <div><code>- list item</code> for bullet lists</div>
                      <div><code>`code`</code> for inline code</div>
                      <div><code>&gt; quote</code> for blockquotes</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-neutral-200 pt-3 mt-4">
                    <div className="text-neutral-600 mb-2">Tags:</div>
                    <div className="space-y-1 text-xs text-neutral-500">
                      <div><code>tag:</code> for highlighted tags at line start</div>
                      <div className="text-neutral-400">Example: work: Meeting notes</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-neutral-200 pt-3 mt-4">
                    <div className="text-xs text-neutral-500">
                      Hover over entries in the sidebar to delete them.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
