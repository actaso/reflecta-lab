'use client';

import { useState } from 'react';
import { Target } from 'lucide-react';

interface FocusCardProps {
  focus: string;
  context?: string;
  onUpdate?: (data: { focus: string; context: string }) => void;
}

export default function FocusCard({ focus, context = "", onUpdate }: FocusCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    focus,
    context
  });

  const handleSave = (field: string, value: string) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    onUpdate?.(newData);
    setEditingField(null);
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/60 py-3 px-3 my-4 shadow-sm max-w-md">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <Target className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-blue-800 mb-1">Main Focus</div>
          
          {/* Main Focus Text */}
          <div 
            className="text-sm font-medium text-gray-800 leading-relaxed mb-1 hover:bg-blue-50 hover:text-blue-800 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text hover:scale-[1.01] hover:shadow-sm"
            onClick={() => setEditingField('focus')}
          >
            {editingField === 'focus' ? (
              <textarea
                value={editData.focus}
                onChange={(e) => setEditData(prev => ({ ...prev, focus: e.target.value }))}
                onBlur={(e) => handleSave('focus', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSave('focus', e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                    setEditData(prev => ({ ...prev, focus }));
                  }
                }}
                placeholder="Your main focus or goal..."
                className="w-full text-sm font-medium text-gray-800 bg-transparent border-none outline-none p-0 leading-relaxed min-h-[50px] resize-none"
                autoFocus
              />
            ) : (
              <span className="block">{editData.focus}</span>
            )}
          </div>
          
          {/* Context */}
          {(context || editingField === 'context') ? (
            <div 
              className="text-xs text-gray-600 leading-relaxed hover:bg-blue-50 hover:text-blue-700 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
              onClick={() => setEditingField('context')}
            >
              {editingField === 'context' ? (
                <textarea
                  value={editData.context}
                  onChange={(e) => setEditData(prev => ({ ...prev, context: e.target.value }))}
                  onBlur={(e) => handleSave('context', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSave('context', e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingField(null);
                      setEditData(prev => ({ ...prev, context }));
                    }
                  }}
                  placeholder="Additional context (optional)..."
                  className="w-full text-xs text-gray-600 bg-transparent border-none outline-none p-0 leading-relaxed min-h-[40px] resize-none"
                  autoFocus
                />
              ) : (
                <span>{editData.context}</span>
              )}
            </div>
          ) : (
            /* Add context option */
            <div 
              onClick={() => setEditingField('context')}
              className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1 -mx-2 cursor-pointer transition-all duration-200 opacity-0 hover:opacity-100"
            >
              + Add context
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 