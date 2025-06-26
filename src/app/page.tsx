'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Toaster } from 'sonner';
import { useUser } from '@clerk/nextjs';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import HelpModal from '../components/HelpModal';
import EntryHeader from '../components/EntryHeader';
import AIChatSidebar from '../components/AIChatSidebar';
import CommandPalette from '../components/CommandPalette';
import { AIMode } from '../components/AIDropdown';
import { formatDate } from '../utils/formatters';
import { 
  useEntries, 
  useEntriesChronological, 
  useCreateEntry, 
  useUpdateEntry, 
  useDeleteEntry,
  useSyncEntries 
} from '@/hooks/useEntries';
import { useFirebaseAuth } from '@/lib/firebase-auth';

export default function JournalApp() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [chatMode, setChatMode] = useState<AIMode | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Refs for scroll handling
  const sidebarRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isKeyboardNavigatingRef = useRef(false);
  const hasInitialSyncRef = useRef(false);

  // Hooks
  const { user } = useUser();
  const { isAuthenticated } = useFirebaseAuth();
  const { data: entries = {}, isLoading } = useEntries();
  const allEntriesChronological = useEntriesChronological();
  const createEntryMutation = useCreateEntry();
  const updateEntryMutation = useUpdateEntry();
  const deleteEntryMutation = useDeleteEntry();
  const syncEntriesMutation = useSyncEntries();

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

  const currentEntry = getCurrentEntry();

  // Handle entry content changes with optimistic updates
  const handleEntryChange = useCallback((value: string) => {
    if (!selectedEntryId) return;
    
    updateEntryMutation.mutate({ 
      entryId: selectedEntryId, 
      content: value 
    });
  }, [selectedEntryId, updateEntryMutation]);

  // Create new entry with optimistic updates
  const createNewEntry = useCallback(() => {
    console.log('📝 Creating new entry...');
    createEntryMutation.mutate('', {
      onSuccess: (data) => {
        setSelectedEntryId(data.entry.id);
        console.log(`📝 Created entry ${data.entry.id} for user ${user?.id || 'anonymous'}`);
        
        // Auto-scroll to the new entry after a brief delay
        setTimeout(() => {
          const entryElement = entryRefs.current[data.entry.id];
          const sidebar = sidebarRef.current;
          
          if (entryElement && sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            const triggerPoint = sidebarRect.height / 3;
            const targetScrollTop = entryElement.offsetTop - triggerPoint;
            sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          }
        }, 100);
      }
    });
  }, [createEntryMutation, user?.id]);

  // Delete entry with optimistic updates
  const deleteEntry = useCallback((entryId: string) => {
    console.log(`🗑️ Deleting entry ${entryId}`);
    deleteEntryMutation.mutate(entryId, {
      onSuccess: () => {
        // If this was the selected entry, select another one
        if (selectedEntryId === entryId) {
          const remainingEntries = allEntriesChronological.filter(({ entry }) => entry.id !== entryId);
          setSelectedEntryId(remainingEntries.length > 0 ? remainingEntries[0].entry.id : null);
        }
      }
    });
  }, [deleteEntryMutation, selectedEntryId, allEntriesChronological]);

  // Initial sync when user authenticates
  useEffect(() => {
    if (!isAuthenticated || !user || hasInitialSyncRef.current) return;

    console.log('🔐 User authenticated, starting initial sync...');
    hasInitialSyncRef.current = true;
    
    syncEntriesMutation.mutate(entries);
  }, [isAuthenticated, user?.id, syncEntriesMutation, entries]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitialSyncRef.current = false;
    }
  }, [isAuthenticated]);

  // Initialize with the first entry and set initial scroll position
  useEffect(() => {
    if (isLoading || selectedEntryId) return;

    if (allEntriesChronological.length > 0) {
      setSelectedEntryId(allEntriesChronological[0].entry.id);
      
      // Set initial scroll position
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const sidebar = sidebarRef.current;
            const firstEntryElement = entryRefs.current[allEntriesChronological[0].entry.id];
            
            if (sidebar && firstEntryElement && firstEntryElement.offsetHeight > 0) {
              const sidebarHeight = sidebar.clientHeight;
              const triggerPoint = sidebarHeight / 3;
              const targetScrollTop = Math.max(0, firstEntryElement.offsetTop - triggerPoint);
              sidebar.scrollTo({ top: targetScrollTop, behavior: 'auto' });
            }
          });
        });
      }, 150);
    }
  }, [selectedEntryId, allEntriesChronological, isLoading]);

  // Scroll-hijacking: Auto-select entry based on scroll position in sidebar
  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current || isKeyboardNavigatingRef.current) return;

      const sidebar = sidebarRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const triggerPoint = sidebarRect.top + sidebarRect.height / 3;
      
      let closestEntryId = null;
      let minDistance = Infinity;

      Object.values(entryRefs.current).forEach((entryElement) => {
        if (!entryElement) return;
        
        const entryRect = entryElement.getBoundingClientRect();
        const entryCenter = entryRect.top + entryRect.height / 2;
        const distance = Math.abs(entryCenter - triggerPoint);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEntryId = entryElement.dataset.entryId || null;
        }
      });

      if (closestEntryId && closestEntryId !== selectedEntryId) {
        setSelectedEntryId(closestEntryId);
      }
    };

    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('scroll', handleScroll);
      return () => sidebar.removeEventListener('scroll', handleScroll);
    }
  }, [selectedEntryId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Cmd+K
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Create new entry: Cmd+Enter
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault();
        createNewEntry();
        return;
      }

      // Navigation: Cmd+Up/Down
      if (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        
        const currentIndex = allEntriesChronological.findIndex(({ entry }) => entry.id === selectedEntryId);
        if (currentIndex === -1) return;

        const newIndex = e.key === 'ArrowUp' 
          ? Math.max(0, currentIndex - 1)
          : Math.min(allEntriesChronological.length - 1, currentIndex + 1);
        
        const newEntryId = allEntriesChronological[newIndex]?.entry.id;
        if (newEntryId) {
          isKeyboardNavigatingRef.current = true;
          setSelectedEntryId(newEntryId);
          
          // Scroll to the entry
          setTimeout(() => {
            const entryElement = entryRefs.current[newEntryId];
            const sidebar = sidebarRef.current;
            
            if (entryElement && sidebar) {
              const sidebarRect = sidebar.getBoundingClientRect();
              const triggerPoint = sidebarRect.height / 3;
              const targetScrollTop = entryElement.offsetTop - triggerPoint;
              sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
              
              setTimeout(() => {
                isKeyboardNavigatingRef.current = false;
              }, 500);
            }
          }, 50);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntryId, createNewEntry, allEntriesChronological]);

  // Handle AI mode selection
  const handleAIModeSelect = (mode: AIMode) => {
    setChatMode(mode);
    setChatSidebarOpen(true);
  };

  // Get context for AI chat
  const getChatContext = () => {
    if (!currentEntry) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentEntry.entry.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center">
        <div className="text-neutral-500 dark:text-neutral-400">Loading your journal...</div>
      </div>
    );
  }

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
              isKeyboardNavigatingRef.current = true;
              setSelectedEntryId(entryId);
              
              setTimeout(() => {
                const entryElement = entryRefs.current[entryId];
                const sidebar = sidebarRef.current;
                
                if (entryElement && sidebar) {
                  const sidebarRect = sidebar.getBoundingClientRect();
                  const triggerPoint = sidebarRect.height / 3;
                  const targetScrollTop = entryElement.offsetTop - triggerPoint;
                  sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  
                  setTimeout(() => {
                    isKeyboardNavigatingRef.current = false;
                  }, 500);
                }
              }, 50);
            }}
          />

          {/* Main Content Area */}
          <div className="flex-1 bg-neutral-50 dark:bg-neutral-900 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
              <EntryHeader
                currentEntry={currentEntry}
                onDeleteEntry={deleteEntry}
              />
              
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
          
          {/* Modals and Sidebars */}
          <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
          
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            entries={entries}
            selectedEntryId={selectedEntryId}
            onSelectEntry={(entryId) => {
              isKeyboardNavigatingRef.current = true;
              setSelectedEntryId(entryId);
              
              setTimeout(() => {
                const entryElement = entryRefs.current[entryId];
                const sidebar = sidebarRef.current;
                
                if (entryElement && sidebar) {
                  const sidebarRect = sidebar.getBoundingClientRect();
                  const triggerPoint = sidebarRect.height / 3;
                  const targetScrollTop = entryElement.offsetTop - triggerPoint;
                  sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  
                  setTimeout(() => {
                    isKeyboardNavigatingRef.current = false;
                  }, 500);
                }
              }, 50);
            }}
          />
          
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
      
      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shadow-lg hover:shadow-xl z-50"
        title="Show shortcuts"
        aria-label="Show shortcuts"
      >
        <span className="text-xl leading-none">?</span>
      </button>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'var(--colors-neutral-50)',
            border: '1px solid var(--colors-neutral-200)',
            color: 'var(--colors-neutral-900)',
          },
        }}
      />
    </div>
  );
}