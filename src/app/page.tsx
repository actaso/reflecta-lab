'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import HelpModal from '../components/HelpModal';
import EntryHeader from '../components/EntryHeader';
import CommandPalette from '../components/CommandPalette';
import MorningGuidanceCard from '../components/MorningGuidanceCard';
import AlignmentModal from '../components/AlignmentModal';
import { formatDate, getAllEntriesChronological } from '../utils/formatters';
import { JournalEntry } from '../types/journal';
import { useJournal } from '../hooks/useJournal';
import { useAnalytics } from '../hooks/useAnalytics';
import { FirestoreService } from '../lib/firestore';

export default function JournalApp() {
  // Use the sync-enabled journal hook
  const { 
    entries: flatEntries, 
    loading, 
    addEntry, 
    updateEntry, 
    deleteEntry: deleteEntryFromHook 
  } = useJournal();
  
  const { user } = useUser();
  const { trackPageView, trackEntryCreated, trackEntryUpdated } = useAnalytics();
  
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showInitialAlignmentModal, setShowInitialAlignmentModal] = useState(false);
  const [userAlignment, setUserAlignment] = useState<string | null>(null);
  
  // Convert flat array to date-keyed format for UI compatibility
  const entries = useMemo(() => {
    const entriesByDate: Record<string, JournalEntry[]> = {};
    flatEntries.forEach(entry => {
      const dateKey = formatDate(entry.timestamp);
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = [];
      }
      entriesByDate[dateKey].push(entry);
    });
    
    // Sort entries within each day by timestamp (newest first)
    Object.keys(entriesByDate).forEach(dateKey => {
      entriesByDate[dateKey].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
    
    return entriesByDate;
  }, [flatEntries]);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isKeyboardNavigatingRef = useRef(false);

  // useJournal hook now handles localStorage loading/saving




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
    
    // Use the hook's updateEntry method
    updateEntry(selectedEntryId, { content: value });
    
    // Track content changes (debounced)
    trackEntryUpdated(selectedEntryId, value.length);
  };

  const createNewEntry = useCallback(async (initialContent?: string) => {
    const now = new Date();
    
    // Format initial content as h2 if provided
    const content = initialContent ? `<h2>${initialContent}</h2><p></p>` : '';
    
    // Use the hook's addEntry method
    const newEntryId = await addEntry({
      timestamp: now,
      content,
      uid: 'local-user', // Will be set by hook when authenticated
      lastUpdated: now
    });
    
    if (newEntryId) {
      // Track entry creation
      trackEntryCreated();
      
      setSelectedEntryId(newEntryId);
      
      // Auto-scroll to the new entry after a brief delay
      setTimeout(() => {
        const entryElement = entryRefs.current[newEntryId];
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
    }
  }, [addEntry, trackEntryCreated]);

  const deleteEntry = async (entryId: string) => {
    // Use the hook's deleteEntry method
    const success = await deleteEntryFromHook(entryId);
    
    if (success && selectedEntryId === entryId) {
      // If this was the selected entry, select another one
      const allEntries = getAllEntriesChronological(entries);
      const remainingEntries = allEntries.filter(({ entry }) => entry.id !== entryId);
      setSelectedEntryId(remainingEntries.length > 0 ? remainingEntries[0].entry.id : null);
    }
  };

  const handleImport = useCallback(async (importedEntries: JournalEntry[]) => {
    try {
      for (const entry of importedEntries) {
        await addEntry({
          timestamp: entry.timestamp,
          content: entry.content,
          uid: entry.uid,
          lastUpdated: entry.lastUpdated
        });
      }
    } catch (error) {
      console.error('Failed to import entries:', error);
    }
  }, [addEntry]);

  // Check for user alignment and show initial modal if needed
  useEffect(() => {
    if (user && !loading) {
      FirestoreService.getUserAccount(user.id)
        .then(userAccount => {
          if (userAccount.alignment) {
            setUserAlignment(userAccount.alignment);
          } else {
            // Show alignment modal for new users after a delay
            setTimeout(() => {
              setShowInitialAlignmentModal(true);
            }, 3000); // 3 second delay to let user settle in
          }
        })
        .catch(error => {
          console.error('Failed to load user alignment:', error);
        });
    }
  }, [user, loading]);

  // Initialize with the first entry and set initial scroll position
  useEffect(() => {
    if (!loading && !selectedEntryId) {
      // Track page view on initial load
      trackPageView();
      
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
  }, [selectedEntryId, allEntriesChronological, loading, trackPageView]);

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
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
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
  }, [selectedEntryId, createNewEntry, allEntriesChronological]);

  const currentEntry = getCurrentEntry();



  return (
    <div className="h-screen bg-neutral-50 dark:bg-neutral-900 flex justify-center">
      <div className="flex max-w-7xl w-full">
        {/* Column 1: Left Sidebar */}
        <div className="w-64 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 overflow-hidden px-6">
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
      </div>

      {/* Column 2: Center Content (Header + Editor) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6">
          {/* Header */}
          <EntryHeader
            currentEntry={currentEntry}
            onDeleteEntry={deleteEntry}
          />
          
          {/* Editor */}
          <div className="flex-1 overflow-auto min-h-0 scrollbar-hide">
            {currentEntry ? (
              <Editor
                content={currentEntry.entry.content}
                onChange={handleEntryChange}
                placeholder="Start writing, press ? for help..."
                autoFocus={true}
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

      {/* Column 3: Right Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col px-6">
        {/* Align with header height */}
        <div className="h-[76px]"></div>
        
        {/* Morning Guidance */}
        <div className="pt-36">
          <MorningGuidanceCard 
            onJournalNow={(content) => createNewEntry(content)} 
            selectedEntryId={selectedEntryId}
            userAlignment={userAlignment}
          />
        </div>
      </div>
    </div>
      
    {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} entries={entries} onImport={handleImport} />
      
      {/* Command Palette */}
      <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            entries={entries}
            selectedEntryId={selectedEntryId}
            onSelectEntry={(entryId) => {
              // Disable scroll-hijacking during command palette selection
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
      
      {/* Floating Help Button - Bottom Right */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shadow-lg hover:shadow-xl z-50"
        title="Show shortcuts"
        aria-label="Show shortcuts"
      >
        <span className="text-xl leading-none">?</span>
      </button>

      {/* Initial Alignment Modal */}
      <AlignmentModal
        isOpen={showInitialAlignmentModal}
        onClose={() => setShowInitialAlignmentModal(false)}
        onSaved={(alignment) => setUserAlignment(alignment)}
        isInitial={true}
      />
    </div>
  );
}
