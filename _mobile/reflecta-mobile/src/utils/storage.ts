import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, EntriesByDate } from '../types';

const ENTRIES_KEY = 'reflecta_entries';

export const saveEntries = async (entries: EntriesByDate): Promise<void> => {
  try {
    const serialized = JSON.stringify(entries, (key, value) => {
      if (key === 'timestamp') {
        return value instanceof Date ? value.toISOString() : value;
      }
      return value;
    });
    await AsyncStorage.setItem(ENTRIES_KEY, serialized);
  } catch (error) {
    console.error('Failed to save entries:', error);
  }
};

export const loadEntries = async (): Promise<EntriesByDate> => {
  try {
    const stored = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    
    // Convert timestamp strings back to Date objects
    Object.keys(parsed).forEach(dateKey => {
      parsed[dateKey] = parsed[dateKey].map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    });
    
    return parsed;
  } catch (error) {
    console.error('Failed to load entries:', error);
    return {};
  }
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const generateId = (): string => {
  return Date.now().toString();
};