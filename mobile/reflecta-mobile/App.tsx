import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Editor } from './src/components/Editor';
import { JournalEntry, EntriesByDate } from './src/types';
import { saveEntries, loadEntries, formatDate, generateId } from './src/utils/storage';
import { formatDateDisplay, formatTime, countWords } from './src/utils/formatters';

export default function App() {
  const [entries, setEntries] = useState<EntriesByDate>({});
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries on app start
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedEntries = await loadEntries();
        setEntries(loadedEntries);
        
        // Auto-select the most recent entry if available
        const allEntries = getAllEntriesChronological(loadedEntries);
        if (allEntries.length > 0) {
          setSelectedEntryId(allEntries[0].id);
        }
      } catch (error) {
        console.error('Failed to load entries:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save entries whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveEntries(entries);
    }
  }, [entries, isLoading]);

  const getAllEntriesChronological = useCallback((entriesData: EntriesByDate): JournalEntry[] => {
    const allEntries: JournalEntry[] = [];
    
    Object.keys(entriesData)
      .sort((a, b) => b.localeCompare(a))
      .forEach(dateKey => {
        const dayEntries = entriesData[dateKey].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        allEntries.push(...dayEntries);
      });
    
    return allEntries;
  }, []);

  const createNewEntry = useCallback(() => {
    const now = new Date();
    const dateKey = formatDate(now);
    const newEntry: JournalEntry = {
      id: generateId(),
      timestamp: now,
      content: '',
    };

    setEntries(prev => ({
      ...prev,
      [dateKey]: [newEntry, ...(prev[dateKey] || [])],
    }));

    setSelectedEntryId(newEntry.id);
  }, []);

  const updateEntryContent = useCallback((entryId: string, content: string) => {
    setEntries(prev => {
      const updated = { ...prev };
      
      Object.keys(updated).forEach(dateKey => {
        const entryIndex = updated[dateKey].findIndex(entry => entry.id === entryId);
        if (entryIndex !== -1) {
          updated[dateKey] = [...updated[dateKey]];
          updated[dateKey][entryIndex] = {
            ...updated[dateKey][entryIndex],
            content,
          };
        }
      });
      
      return updated;
    });
  }, []);

  const getSelectedEntry = useCallback((): JournalEntry | null => {
    if (!selectedEntryId) return null;
    
    for (const dateKey of Object.keys(entries)) {
      const entry = entries[dateKey].find(e => e.id === selectedEntryId);
      if (entry) return entry;
    }
    
    return null;
  }, [entries, selectedEntryId]);

  const selectedEntry = getSelectedEntry();

  if (isLoading) {
    return <View style={styles.container} />;
  }

  const chronologicalEntries = getAllEntriesChronological(entries);
  
  const renderTimelineOverlay = () => {
    // Filter out selected entry first, then check if we have others to show
    const otherEntries = chronologicalEntries.filter(entry => entry.id !== selectedEntryId);
    
    if (otherEntries.length === 0) return null;
    
    return (
      <View style={styles.timelineOverlay}>
        {otherEntries.slice(0, 5).map((entry, index) => {
          return (
            <TouchableOpacity
              key={entry.id}
              style={[styles.overlayEntry, { opacity: 0.7 - (index * 0.1) }]}
              onPress={() => {
                setSelectedEntryId(entry.id);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.overlayLine} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.editorContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {selectedEntry ? (
          <Editor
            content={selectedEntry.content}
            onChange={(content) => updateEntryContent(selectedEntry.id, content)}
            autoFocus={selectedEntry.content === ''}
            placeholder="Start writing..."
          />
        ) : (
          <Editor
            content=""
            onChange={() => {}}
            placeholder="Start writing..."
            autoFocus={true}
          />
        )}
      </ScrollView>
      
      {renderTimelineOverlay()}

      <TouchableOpacity
        style={styles.fab}
        onPress={createNewEntry}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  editorContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
    minHeight: '100%',
  },
  timelineOverlay: {
    position: 'absolute',
    top: 80,
    right: 12,
    width: 16,
    zIndex: 1000,
    pointerEvents: 'auto',
  },
  overlayEntry: {
    marginBottom: 24,
    paddingVertical: 6,
    paddingHorizontal: 6,
    pointerEvents: 'auto',
  },
  overlayLine: {
    height: 3,
    backgroundColor: '#CCCCCC',
    width: 5,
    borderRadius: 2.5,
  },
  fab: {
    position: 'absolute',
    bottom: 34,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
});
