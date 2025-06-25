'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import HelpModal from '../components/HelpModal';
import EntryHeader from '../components/EntryHeader';
import AIChatSidebar from '../components/AIChatSidebar';
import { AIMode } from '../components/AIDropdown';
import { formatDate, getAllEntriesChronological } from '../utils/formatters';

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
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [chatMode, setChatMode] = useState<AIMode | null>(null);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isKeyboardNavigatingRef = useRef(false);

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




  const allEntriesChronological = getAllEntriesChronological(entries);

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
            const allEntries = getAllEntriesChronological(newEntries);
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
      if (allEntriesChronological.length > 0) {
        setSelectedEntryId(allEntriesChronological[0].entry.id);
        
        // Set initial scroll position to show the first entry in the trigger zone
        // Use multiple animation frames to ensure everything is fully rendered
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const sidebar = sidebarRef.current;
              const firstEntryElement = entryRefs.current[allEntriesChronological[0].entry.id];
              
              if (sidebar && firstEntryElement) {
                // Double-check that the element has been rendered
                if (firstEntryElement.offsetHeight > 0) {
                  const sidebarHeight = sidebar.clientHeight;
                  const triggerPoint = sidebarHeight / 3;
                  const targetScrollTop = Math.max(0, firstEntryElement.offsetTop - triggerPoint);
                  sidebar.scrollTo({ top: targetScrollTop, behavior: 'auto' });
                }
              }
            });
          });
        }, 150);
      }
    }
  }, [selectedEntryId, allEntriesChronological, isLoaded]);

  // Scroll-hijacking: Auto-select entry based on scroll position in sidebar
  useEffect(() => {
    const handleScroll = () => {
      // Skip scroll-hijacking during keyboard navigation
      if (!sidebarRef.current || isKeyboardNavigatingRef.current) return;

      const sidebar = sidebarRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const triggerPoint = sidebarRect.top + sidebarRect.height / 3;
      
      let closestEntryId = null;
      let closestDistance = Infinity;
      
      if (allEntriesChronological.length === 0) return;

      // Simple approach: find the entry closest to the trigger point
      for (const { entry } of allEntriesChronological) {
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
      
      return () => sidebar.removeEventListener('scroll', handleScroll);
    }
  }, [selectedEntryId, allEntriesChronological]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to close help modal
      if (event.key === 'Escape' && showHelp) {
        event.preventDefault();
        setShowHelp(false);
        return;
      }

      // CMD+Enter to create new entry
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        createNewEntry();
        return;
      }

      // CMD+Up/Down to navigate through entries
      if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        
        if (allEntriesChronological.length === 0) return;

        let currentIndex = selectedEntryId 
          ? allEntriesChronological.findIndex(({ entry }) => entry.id === selectedEntryId)
          : -1;

        if (event.key === 'ArrowUp') {
          // Move to previous entry (newer)
          currentIndex = currentIndex <= 0 ? allEntriesChronological.length - 1 : currentIndex - 1;
        } else {
          // Move to next entry (older)
          currentIndex = currentIndex >= allEntriesChronological.length - 1 ? 0 : currentIndex + 1;
        }

        const newSelectedEntry = allEntriesChronological[currentIndex];
        if (newSelectedEntry) {
          // Set flag to disable scroll-hijacking during navigation (immediate, synchronous)
          isKeyboardNavigatingRef.current = true;
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
              
              // Re-enable scroll-hijacking after scroll animation completes
              setTimeout(() => {
                isKeyboardNavigatingRef.current = false;
              }, 500); // Allow time for smooth scroll to complete
            }
          }, 50);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntryId, createNewEntry, allEntriesChronological, showHelp]);

  const currentEntry = getCurrentEntry();

  // Handle AI mode selection from dropdown
  const handleAIModeSelect = (mode: AIMode) => {
    setChatMode(mode);
    setChatSidebarOpen(true);
  };

  // Get context for AI chat (current entry content + some additional context)
  const getChatContext = () => {
    if (!currentEntry) return '';
    
    // Extract plain text from HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentEntry.entry.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Format with timestamp for better context
    const timestamp = currentEntry.entry.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `Journal Entry from ${timestamp}:\n\n${textContent}`;
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Container to center sidebar and content */}
      <div className="flex-1 flex justify-center">
        <div className={`flex max-w-7xl w-full ${chatSidebarOpen ? 'pr-0' : ''}`}>
          {/* Left Sidebar - Entry navigation */}
          <Sidebar
            entries={entries}
            selectedEntryId={selectedEntryId}
            sidebarRef={sidebarRef}
            entryRefs={entryRefs}
            onSelectEntry={(entryId) => {
              // Disable scroll-hijacking during manual selection
              isKeyboardNavigatingRef.current = true;
              setSelectedEntryId(entryId);
              
              // Scroll to the selected entry
              setTimeout(() => {
                const entryElement = entryRefs.current[entryId];
                const sidebar = sidebarRef.current;
                
                if (entryElement && sidebar) {
                  const sidebarRect = sidebar.getBoundingClientRect();
                  const triggerPoint = sidebarRect.height / 3;
                  const targetScrollTop = entryElement.offsetTop - triggerPoint;
                  sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  
                  // Re-enable scroll-hijacking after scroll animation completes
                  setTimeout(() => {
                    isKeyboardNavigatingRef.current = false;
                  }, 500);
                }
              }, 50);
            }}
          />

          {/* Main Content Area */}
          <div className="flex-1 bg-neutral-50 dark:bg-neutral-900 flex flex-col overflow-hidden">
            {/* Content Container with max width */}
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
              {/* Header with entry info and buttons */}
              <EntryHeader
                currentEntry={currentEntry}
                onDeleteEntry={deleteEntry}
              />
              
              {/* Writing area */}
              <div className="flex-1 px-8 pb-8 overflow-auto min-h-0 scrollbar-hide">
                {currentEntry ? (
                  <Editor
                    content={currentEntry.entry.content}
                    onChange={handleEntryChange}
                    placeholder="Start writing, press ? for help..."
                    autoFocus={true}
                    onAIModeSelect={handleAIModeSelect}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
                    <div className="text-center">
                      <div className="text-lg mb-2">Welcome to your journal</div>
                      <div className="text-sm">Press Cmd+Enter to create your first entry</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Help Modal */}
          <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
          
          {/* AI Chat Sidebar */}
          <AIChatSidebar
            isOpen={chatSidebarOpen}
            mode={chatMode}
            context={getChatContext()}
            onClose={() => {
              setChatSidebarOpen(false);
              setChatMode(null);
            }}
          />
        </div>
      </div>
      
      {/* Floating Help Button - Bottom Right */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shadow-lg hover:shadow-xl z-50"
        title="Show shortcuts"
        aria-label="Show shortcuts"
      >
        <span className="text-xl leading-none">?</span>
      </button>
    </div>
  );
}
