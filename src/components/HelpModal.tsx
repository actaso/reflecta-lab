'use client';

import { JournalEntry } from '../types/journal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Record<string, JournalEntry[]>;
  onImport: (entries: JournalEntry[]) => void;
}

export default function HelpModal({ isOpen, onClose, entries, onImport }: HelpModalProps) {
  if (!isOpen) return null;

  const exportToCSV = () => {
    // Convert entries to flat array and sort by timestamp
    const allEntries: { entry: JournalEntry; dateKey: string }[] = [];
    
    Object.keys(entries).forEach(dateKey => {
      entries[dateKey].forEach(entry => {
        allEntries.push({ entry, dateKey });
      });
    });
    
    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
    
    // Create CSV content
    const csvHeader = 'Date,Time,Content\n';
    const csvRows = allEntries.map(({ entry }) => {
      const date = entry.timestamp.toLocaleDateString();
      const time = entry.timestamp.toLocaleTimeString();
      
      // Strip HTML tags from content and clean up for CSV
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = entry.content;
      const textContent = (tempDiv.textContent || tempDiv.innerText || '').trim();
      
      // Escape quotes and wrap in quotes to handle commas/newlines
      const escapedContent = '"' + textContent.replace(/"/g, '""') + '"';
      
      return `${date},${time},${escapedContent}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `journal-backup-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('CSV file appears to be empty or invalid');
          return;
        }

        const header = lines[0].toLowerCase();
        if (!header.includes('date') || !header.includes('time') || !header.includes('content')) {
          alert('CSV file must have Date, Time, and Content columns');
          return;
        }

        const importedEntries: JournalEntry[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i];
            const matches = line.match(/^([^,]+),([^,]+),"(.*)"$/);
            
            if (!matches) {
              errors.push(`Line ${i + 1}: Invalid format`);
              continue;
            }

            const [, dateStr, timeStr, content] = matches;
            const unescapedContent = content.replace(/""/g, '"');
            
            const dateTime = new Date(`${dateStr} ${timeStr}`);
            if (isNaN(dateTime.getTime())) {
              errors.push(`Line ${i + 1}: Invalid date/time format`);
              continue;
            }

            const entry: JournalEntry = {
              id: crypto.randomUUID(),
              timestamp: dateTime,
              content: unescapedContent,
              uid: 'imported-user',
              lastUpdated: new Date()
            };

            importedEntries.push(entry);
          } catch (error) {
            errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (errors.length > 0) {
          const errorMessage = `Import completed with ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`;
          alert(errorMessage);
        }

        if (importedEntries.length > 0) {
          onImport(importedEntries);
          alert(`Successfully imported ${importedEntries.length} entries`);
        } else {
          alert('No valid entries found in the CSV file');
        }
      } catch (error) {
        alert(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="absolute inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-black dark:text-white">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-300">Search entries</span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs font-mono">Cmd+K</kbd>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-300">Create new entry</span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs font-mono">Cmd+Enter</kbd>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-300">Navigate to newer entry</span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs font-mono">Cmd+↑</kbd>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-300">Navigate to older entry</span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs font-mono">Cmd+↓</kbd>
          </div>
          
          <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3 mt-4">
            <div className="text-neutral-600 dark:text-neutral-300 mb-2">Markdown Support:</div>
            <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <div><code># Heading</code> for headers</div>
              <div><code>**bold**</code> and <code>*italic*</code></div>
              <div><code>- list item</code> for bullet lists</div>
              <div><code>- [ ] task</code> for task lists</div>
              <div><code>- [x] completed</code> for checked tasks</div>
              <div><code>`code`</code> for inline code</div>
              <div><code>&gt; quote</code> for blockquotes</div>
            </div>
          </div>
          
          <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3 mt-4">
            <div className="text-neutral-600 dark:text-neutral-300 mb-2">Tags:</div>
            <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <div><code>tag:</code> for highlighted tags at line start</div>
              <div className="text-neutral-400 dark:text-neutral-500">Example: work: Meeting notes</div>
            </div>
          </div>
          
          <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3 mt-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Hover over entries in the sidebar to delete them.
            </div>
          </div>
          
          <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3 mt-4">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm font-medium mb-3"
            >
              Export Backup (CSV)
            </button>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
              Download all entries as CSV for backup
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={importFromCSV}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="import-csv"
              />
              <label
                htmlFor="import-csv"
                className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm font-medium cursor-pointer flex items-center justify-center"
              >
                Import from CSV
              </label>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center">
              Upload a CSV file to import entries
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
