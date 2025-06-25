'use client';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

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
        </div>
      </div>
    </div>
  );
}
