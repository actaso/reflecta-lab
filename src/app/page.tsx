'use client';

import { useState, useEffect, useRef } from 'react';

type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

export default function JournalApp() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, JournalEntry[]>>({
    '2023-10-04': [],
    '2023-10-03': [
      {
        id: '1',
        timestamp: new Date('2023-10-03T14:30:00'),
        content: 'Had a great meeting with the team today...'
      },
      {
        id: '2', 
        timestamp: new Date('2023-10-03T09:15:00'),
        content: 'Morning reflections on the project direction.'
      }
    ],
    '2023-10-02': [
      {
        id: '3',
        timestamp: new Date('2023-10-02T16:45:00'),
        content: 'Worked on the new feature implementation.'
      }
    ],
  });
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Generate dates for the sidebar (last 30 days + next 7 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date('2023-10-04'); // Using the date from your design
    
    // Previous 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    // Next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const dates = generateDates();
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

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

  // Get all entries sorted by date and time (newest first)
  const getAllEntriesChronological = () => {
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
  };

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

  const createNewEntry = () => {
    const today = new Date();
    today.setFullYear(2023, 9, 4); // Use the same base date for consistency
    const todayKey = formatDate(today);
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      timestamp: today,
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
        const entryRect = entryElement.getBoundingClientRect();
        const triggerPoint = sidebarRect.height / 3;
        
        // Scroll to position the entry at the trigger point
        const targetScrollTop = entryElement.offsetTop - triggerPoint;
        sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }, 100);
  };

  // Initialize with the first entry and set initial scroll position
  useEffect(() => {
    if (!selectedEntryId) {
      const allEntries = getAllEntriesChronological();
      if (allEntries.length > 0) {
        setSelectedEntryId(allEntries[0].entry.id);
        
        // Set initial scroll position to show the first entry in the trigger zone
        setTimeout(() => {
          const sidebar = sidebarRef.current;
          const firstEntryElement = entryRefs.current[allEntries[0].entry.id];
          
          if (sidebar && firstEntryElement) {
            const sidebarHeight = sidebar.clientHeight;
            const triggerPoint = sidebarHeight / 3;
            const targetScrollTop = firstEntryElement.offsetTop - triggerPoint;
            sidebar.scrollTo({ top: targetScrollTop, behavior: 'auto' }); // Use 'auto' for instant initial positioning
          }
        }, 50);
      }
    }
  }, [selectedEntryId]);

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
  }, [selectedEntryId]);

  const currentEntry = getCurrentEntry();
  const allEntries = getAllEntriesChronological();

  return (
    <div className="flex h-screen bg-neutral-50 font-[family-name:var(--font-geist-sans)]">
      {/* Left Sidebar - Entry navigation with dynamic scrollable area */}
      <div 
        ref={sidebarRef}
        className="w-64 bg-neutral-50 flex flex-col overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
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
              today.setFullYear(2023, 9, 4); // Use the same base date for consistency
              
              if (dayEntries.length === 0 && dateKey !== formatDate(today)) {
                return null; // Don't show empty days except today
              }
              
              return (
                <div key={dateKey} className="space-y-2">
                  {/* Date header with entry count indicators */}
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-normal text-neutral-600">
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
                  <div className="ml-2 space-y-1">
                    {sortedDayEntries.map((entry) => {
                      const isSelected = selectedEntryId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          ref={(el) => {
                            entryRefs.current[entry.id] = el;
                          }}
                          onClick={() => setSelectedEntryId(entry.id)}
                          className={`cursor-pointer py-1 px-2 rounded transition-colors duration-200 ${
                            isSelected 
                              ? 'text-black bg-neutral-100' 
                              : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="text-xs text-neutral-500 mb-1">
                            {formatTime(entry.timestamp)}
                          </div>
                          <div className="text-sm truncate">
                            {entry.content || 'Empty entry'}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show "No entries" for today if empty */}
                    {dayEntries.length === 0 && dateKey === formatDate(today) && (
                      <div className="text-xs text-neutral-400 ml-2 py-1">
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
          
          {/* + Button for creating new entries */}
          <button
            onClick={createNewEntry}
            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
            title="Add new entry"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
        
        {/* Writing area */}
        <div className="flex-1 px-8 pb-8">
          {currentEntry ? (
            <textarea
              value={currentEntry.entry.content}
              onChange={(e) => handleEntryChange(e.target.value)}
              placeholder="Start writing, hit ? to ask questions..."
              className="w-full h-full resize-none border-none outline-none text-black placeholder-neutral-400 bg-transparent text-base leading-relaxed font-[family-name:var(--font-geist-sans)]"
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              <div className="text-center">
                <div className="text-lg mb-2">Welcome to your journal</div>
                <div className="text-sm">Click the + button to create your first entry</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
