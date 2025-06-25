import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { JournalEntry, EntriesByDate } from '../types';
import { formatDateDisplay, formatTime, getPreviewText, countWords } from '../utils/formatters';

interface TimelineProps {
  entries: EntriesByDate;
  selectedEntryId: string | null;
  onEntrySelect: (entryId: string) => void;
  onCreateEntry: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  selectedEntryId,
  onEntrySelect,
  onCreateEntry,
}) => {
  // Get all entries sorted chronologically (newest first)
  const getAllEntriesChronological = (): JournalEntry[] => {
    const allEntries: JournalEntry[] = [];
    
    Object.keys(entries)
      .sort((a, b) => b.localeCompare(a)) // Sort dates descending
      .forEach(dateKey => {
        const dayEntries = entries[dateKey].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        allEntries.push(...dayEntries);
      });
    
    return allEntries;
  };

  const chronologicalEntries = getAllEntriesChronological();
  
  // Group entries by date for display
  const groupedEntries: { date: string; entries: JournalEntry[] }[] = [];
  const dateGroups: Record<string, JournalEntry[]> = {};
  
  chronologicalEntries.forEach(entry => {
    const dateKey = entry.timestamp.toISOString().split('T')[0];
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = [];
    }
    dateGroups[dateKey].push(entry);
  });
  
  Object.keys(dateGroups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(dateKey => {
      groupedEntries.push({
        date: dateKey,
        entries: dateGroups[dateKey]
      });
    });

  const renderEntryIndicator = (entry: JournalEntry) => {
    const wordCount = countWords(entry.content);
    const maxWidth = 80;
    const width = Math.max(8, Math.min(maxWidth, wordCount * 2));
    
    return (
      <View 
        style={[
          styles.entryIndicator,
          { width },
          selectedEntryId === entry.id && styles.selectedIndicator
        ]} 
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reflecta</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={onCreateEntry}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {groupedEntries.map(({ date, entries: dayEntries }) => (
          <View key={date}>
            <View style={styles.dateHeader}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {formatDateDisplay(new Date(date))}
              </Text>
            </View>
            
            {dayEntries.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={[
                  styles.entryItem,
                  selectedEntryId === entry.id && styles.selectedEntry
                ]}
                onPress={() => onEntrySelect(entry.id)}
              >
                <View style={styles.entryContent}>
                  {renderEntryIndicator(entry)}
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryTime}>
                      {formatTime(entry.timestamp)}
                    </Text>
                    <Text style={styles.entryPreview} numberOfLines={1}>
                      {getPreviewText(entry.content)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        
        {chronologicalEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first entry</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dc3545',
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc3545',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
  },
  entryItem: {
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  selectedEntry: {
    backgroundColor: '#e3f2fd',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIndicator: {
    height: 3,
    backgroundColor: '#6c757d',
    borderRadius: 1.5,
    marginRight: 12,
  },
  selectedIndicator: {
    backgroundColor: '#007bff',
  },
  entryInfo: {
    flex: 1,
  },
  entryTime: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  entryPreview: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
  },
});