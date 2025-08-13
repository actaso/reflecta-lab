'use client';

// Error Boundary Journal Test Page
// This page mirrors the main Journal page but wraps critical sections
// with our Error Boundaries so you can preview the exact UI/UX.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Use path aliases for cleaner imports and to avoid relative depth issues
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import HelpModal from '@/components/HelpModal';
import EntryHeader from '@/components/EntryHeader';
import CommandPalette from '@/components/CommandPalette';
import CoachingSessionCard from '@/components/CoachingSessionCard';
import CoachingMessageCard from '@/components/CoachingMessageCard';

import { ErrorBoundary, AIErrorBoundary, EditorErrorBoundary, SidebarErrorBoundary } from '@/components/error-boundaries';

import { formatDate, getAllEntriesChronological } from '@/utils/formatters';
import { JournalEntry, ImageMetadata } from '@/types/journal';
import { CoachingSession } from '@/types/coachingSession';
import { CoachingMessage } from '@/types/coachingMessage';
import { useJournal } from '@/hooks/useJournal';
import { useAnalytics } from '@/hooks/useAnalytics';
import { FirestoreService } from '@/lib/firestore';

export default function JournalAppErrorBoundaryTest() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Simple thrower component to simulate crashes
  const Thrower = ({ label }: { label: string }) => {
    // Throw on render to simulate a hard crash
    throw new Error(`Simulated crash: ${label}`);
  };

  // Parse crash flags from URL, e.g. ?crash=page,sidebar,editor,ai,header
  const crashFlags = new Set(
    (searchParams.get('crash') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  // Use the sync-enabled journal hook
  const {
    entries: flatEntries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry: deleteEntryFromHook,
    updateImageMetadata
  } = useJournal();

  const { trackPageView, trackEntryCreated, trackEntryUpdated } = useAnalytics();

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Coaching session state
  const [coachingSessionData, setCoachingSessionData] = useState<CoachingSession | null>(null);
  const [loadingCoachingSession, setLoadingCoachingSession] = useState(false);

  // Coaching message state
  const [coachingMessageData, setCoachingMessageData] = useState<CoachingMessage | null>(null);
  const [loadingCoachingMessage, setLoadingCoachingMessage] = useState(false);

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
    Object.keys(entriesByDate).forEach(dateKey => {
      entriesByDate[dateKey].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
    return entriesByDate;
  }, [flatEntries]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isKeyboardNavigatingRef = useRef(false);

  const allEntriesChronological = getAllEntriesChronological(entries);

  const getCurrentEntry = useCallback(() => {
    if (!selectedEntryId) return null;
    for (const dateKey of Object.keys(entries)) {
      const dayEntries = entries[dateKey] || [];
      const entry = dayEntries.find(e => e.id === selectedEntryId);
      if (entry) return { entry, dateKey };
    }
    return null;
  }, [selectedEntryId, entries]);

  const handleEntryChange = (value: string) => {
    if (!selectedEntryId) return;
    updateEntry(selectedEntryId, { content: value });
    trackEntryUpdated(selectedEntryId, value.length);
  };

  const handleImageUploaded = useCallback((imageMetadata: ImageMetadata) => {
    if (!selectedEntryId) return;
    const currentEntry = flatEntries.find(entry => entry.id === selectedEntryId);
    if (currentEntry) {
      const updatedEntry = updateImageMetadata(currentEntry, imageMetadata);
      updateEntry(selectedEntryId, { images: updatedEntry.images });
    }
  }, [selectedEntryId, flatEntries, updateImageMetadata, updateEntry]);

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('dragenter', preventDefault);
    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragenter', preventDefault);
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const createNewEntry = useCallback(async (initialContent?: string) => {
    const now = new Date();
    const content = initialContent ? `<h2>${initialContent}</h2><p></p>` : '';
    const newEntryId = await addEntry({
      timestamp: now,
      content,
      uid: 'local-user',
      lastUpdated: now
    });
    if (newEntryId) {
      trackEntryCreated();
      setSelectedEntryId(newEntryId);
      setTimeout(() => {
        const entryElement = entryRefs.current[newEntryId];
        const sidebar = sidebarRef.current;
        if (entryElement && sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const triggerPoint = sidebarRect.height / 3;
          const targetScrollTop = entryElement.offsetTop - triggerPoint;
          sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [addEntry, trackEntryCreated]);

  const deleteEntry = async (entryId: string) => {
    const success = await deleteEntryFromHook(entryId);
    if (success && selectedEntryId === entryId) {
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

  useEffect(() => {
    if (!loading && !selectedEntryId) {
      trackPageView();
      if (allEntriesChronological.length > 0) {
        setSelectedEntryId(allEntriesChronological[0].entry.id);
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const sidebar = sidebarRef.current;
              const firstEntryElement = entryRefs.current[allEntriesChronological[0].entry.id];
              if (sidebar && firstEntryElement) {
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

  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current || isKeyboardNavigatingRef.current) return;
      const sidebar = sidebarRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const triggerPoint = sidebarRect.top + sidebarRect.height / 3;
      let closestEntryId: string | null = null;
      let closestDistance = Infinity;
      if (allEntriesChronological.length === 0) return;
      for (const { entry } of allEntriesChronological) {
        const element = entryRefs.current[entry.id];
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const elementCenter = elementRect.top + elementRect.height / 2;
          const distance = Math.abs(elementCenter - triggerPoint);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestEntryId = entry.id;
          }
        }
      }
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        const activeElement = document.activeElement;
        const isEditorFocused = activeElement?.closest('.ProseMirror');
        if (!isEditorFocused) {
          event.preventDefault();
          createNewEntry();
          return;
        }
      }
      if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        if (allEntriesChronological.length === 0) return;
        let currentIndex = selectedEntryId
          ? allEntriesChronological.findIndex(({ entry }) => entry.id === selectedEntryId)
          : -1;
        if (event.key === 'ArrowUp') {
          currentIndex = currentIndex <= 0 ? allEntriesChronological.length - 1 : currentIndex - 1;
        } else {
          currentIndex = currentIndex >= allEntriesChronological.length - 1 ? 0 : currentIndex + 1;
        }
        const newSelectedEntry = allEntriesChronological[currentIndex];
        if (newSelectedEntry) {
          isKeyboardNavigatingRef.current = true;
          setSelectedEntryId(newSelectedEntry.entry.id);
          setTimeout(() => {
            const entryElement = entryRefs.current[newSelectedEntry.entry.id];
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

  useEffect(() => {
    const handleVoiceTranscription = (event: CustomEvent) => {
      const { text, route } = event.detail;
      if (route === 'journal' && selectedEntryId) {
        const currentEntry = getCurrentEntry();
        if (currentEntry?.entry) {
          const newContent = currentEntry.entry.content + (currentEntry.entry.content ? '\n\n' : '') + text;
          updateEntry(selectedEntryId, { content: newContent });
          setTimeout(() => {
            const focusEvent = new CustomEvent('focusEditor', { detail: { entryId: selectedEntryId } });
            window.dispatchEvent(focusEvent);
          }, 100);
        }
      }
    };
    window.addEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    return () => {
      window.removeEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    };
  }, [selectedEntryId, updateEntry, getCurrentEntry]);

  const fetchCoachingSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setLoadingCoachingSession(true);
    try {
      const url = `/api/coaching/sessions?sessionId=${encodeURIComponent(sessionId)}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.session) {
          setCoachingSessionData(result.session);
        } else {
          setCoachingSessionData(null);
        }
      } else {
        console.warn('Failed to fetch coaching session:', response.status);
        setCoachingSessionData(null);
      }
    } catch (error) {
      console.error('Error fetching coaching session:', error);
      setCoachingSessionData(null);
    } finally {
      setLoadingCoachingSession(false);
    }
  }, []);

  const fetchCoachingMessage = useCallback(async (messageId: string) => {
    if (!messageId) return;
    setLoadingCoachingMessage(true);
    try {
      const coachingMessage = await FirestoreService.getCoachingMessage(messageId);
      setCoachingMessageData(coachingMessage);
    } catch (error) {
      console.error('Error fetching coaching message:', error);
      setCoachingMessageData(null);
    } finally {
      setLoadingCoachingMessage(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedEntryId) {
      setCoachingSessionData(null);
      setCoachingMessageData(null);
      return;
    }
    const currentEntryData = flatEntries.find(entry => entry.id === selectedEntryId);
    const linkedSessionId = currentEntryData?.linkedCoachingSessionId;
    const linkedMessageId = currentEntryData?.linkedCoachingMessageId;
    if (linkedSessionId && linkedSessionId !== coachingSessionData?.id) {
      fetchCoachingSession(linkedSessionId);
    } else if (!linkedSessionId) {
      setCoachingSessionData(null);
    }
    if (linkedMessageId && linkedMessageId !== coachingMessageData?.id) {
      fetchCoachingMessage(linkedMessageId);
    } else if (!linkedMessageId) {
      setCoachingMessageData(null);
    }
  }, [selectedEntryId, flatEntries, fetchCoachingSession, fetchCoachingMessage, coachingSessionData?.id, coachingMessageData?.id]);

  const handleOpenCoachingSession = useCallback(() => {
    if (coachingSessionData?.id) {
      router.push(`/coach?sessionId=${coachingSessionData.id}`);
    }
  }, [router, coachingSessionData?.id]);

  const currentEntry = getCurrentEntry();

  const onSelectEntry = (entryId: string) => {
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
  };

  // If we want to simulate a full page crash, throw inside the page-level boundary
  if (crashFlags.has('page')) {
    return (
      <ErrorBoundary level="page" context="Journal App (Test)">
        <Thrower label="page" />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" context="Journal App (Test)">
      <div className="h-screen bg-neutral-50 dark:bg-neutral-900 flex justify-center">
        <div className="flex max-w-7xl w-full">
          {/* Column 1: Left Sidebar */}
          <div className="w-64 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 overflow-hidden px-6">
            <SidebarErrorBoundary>
              {crashFlags.has('sidebar') ? (
                <Thrower label="sidebar" />
              ) : (
                <Sidebar
                  entries={entries}
                  selectedEntryId={selectedEntryId}
                  sidebarRef={sidebarRef}
                  entryRefs={entryRefs}
                  onSelectEntry={onSelectEntry}
                />
              )}
            </SidebarErrorBoundary>
          </div>

          {/* Column 2: Center Content (Header + Editor) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6">
              {/* Header */}
              <ErrorBoundary level="component" context="Entry Header">
                {crashFlags.has('header') ? (
                  <Thrower label="header" />
                ) : (
                  <EntryHeader currentEntry={currentEntry} onDeleteEntry={deleteEntry} />
                )}
              </ErrorBoundary>

              {/* Coaching Session Card / Message */}
              <AIErrorBoundary>
                {crashFlags.has('ai') ? (
                  <Thrower label="ai" />
                ) : (
                  <>
                    {(coachingSessionData || loadingCoachingSession) && (
                      <CoachingSessionCard
                        title={
                          coachingSessionData?.sessionType === 'initial-life-deep-dive'
                            ? 'Life Deep Dive Session'
                            : 'Goal breakout session'
                        }
                        messageCount={coachingSessionData?.messages.length || 0}
                        sessionType={
                          coachingSessionData?.sessionType === 'initial-life-deep-dive'
                            ? 'Initial Life Deep Dive'
                            : 'Coach chat'
                        }
                        onOpenConversation={handleOpenCoachingSession}
                        loading={loadingCoachingSession}
                      />
                    )}
                    {(coachingMessageData || loadingCoachingMessage) && (
                      <CoachingMessageCard
                        pushText={coachingMessageData?.pushNotificationText}
                        fullMessage={coachingMessageData?.messageContent}
                        messageType={coachingMessageData?.messageType}
                        loading={loadingCoachingMessage}
                      />
                    )}
                  </>
                )}
              </AIErrorBoundary>

              {/* Editor */}
              <div className="flex-1 min-h-0 relative">
                {currentEntry ? (
                  <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div className="min-h-full pb-[50vh]">
                      <EditorErrorBoundary>
                        {crashFlags.has('editor') ? (
                          <Thrower label="editor" />
                        ) : (
                          <Editor
                            content={currentEntry.entry.content}
                            onChange={handleEntryChange}
                            placeholder="Start writing, press ? for help..."
                            autoFocus={true}
                            entryId={selectedEntryId || undefined}
                            onImageUploaded={handleImageUploaded}
                            onCreateNewEntry={createNewEntry}
                          />
                        )}
                      </EditorErrorBoundary>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
                    <div className="text-center">
                      <div className="text-lg mb-2">Welcome to your journal (Error Boundary Test)</div>
                      <div className="text-sm">Press Cmd+Enter to create your first entry</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Right Sidebar (empty placeholder) */}
          <div className="w-80 flex-shrink-0 flex flex-col px-6">
            <div className="h-[76px]"></div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <ErrorBoundary level="component" context="Help Modal">
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} entries={entries} onImport={handleImport} />
      </ErrorBoundary>

      {/* Command Palette */}
      <ErrorBoundary level="component" context="Command Palette">
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={onSelectEntry}
        />
      </ErrorBoundary>

      {/* Floating Help Button - Top Right */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed top-6 right-6 w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shadow-md hover:shadow-lg z-40"
        title="Show shortcuts"
        aria-label="Show shortcuts"
      >
        <span className="text-lg leading-none">?</span>
      </button>
    </ErrorBoundary>
  );
}


