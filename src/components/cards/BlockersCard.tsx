'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface BlockersCardProps {
  blockers: string[];
  title?: string;
  onUpdate?: (data: { blockers: string[]; title: string }) => void;
}

export default function BlockersCard({ blockers, title = "Key Blockers", onUpdate }: BlockersCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    blockers: [...blockers],
    title
  });

  const handleSave = (field: string, value: string | string[]) => {
    const newData = { ...editData, [field]: value };
    // Filter out empty blockers if updating blockers
    if (field === 'blockers' && Array.isArray(value)) {
      newData.blockers = value.filter(blocker => blocker.trim() !== '');
    }
    setEditData(newData);
    onUpdate?.(newData);
    setEditingField(null);
    setEditingIndex(null);
  };

  const updateBlocker = (index: number, value: string) => {
    const newBlockers = editData.blockers.map((blocker, i) => i === index ? value : blocker);
    setEditData(prev => ({ ...prev, blockers: newBlockers }));
  };

  const removeBlocker = (index: number) => {
    const newBlockers = editData.blockers.filter((_, i) => i !== index);
    handleSave('blockers', newBlockers);
  };

  const addBlocker = () => {
    const newBlockers = [...editData.blockers, ''];
    setEditData(prev => ({ ...prev, blockers: newBlockers }));
    setEditingIndex(newBlockers.length - 1);
    setEditingField('blocker');
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200/60 py-3 px-3 my-4 shadow-sm max-w-md">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div 
            className="text-xs font-medium text-amber-800 mb-2 hover:bg-amber-50 hover:text-amber-900 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
            onClick={() => setEditingField('title')}
          >
            {editingField === 'title' ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                onBlur={(e) => handleSave('title', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave('title', e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                    setEditData(prev => ({ ...prev, title }));
                  }
                }}
                className="w-full text-xs font-medium text-amber-800 bg-transparent border-none outline-none p-0"
                autoFocus
              />
            ) : (
              <span>{editData.title}</span>
            )}
          </div>
          
          {/* Blockers List */}
          <div className="space-y-1.5">
            {editData.blockers.map((blocker, index) => (
              <div key={index} className="group flex items-start gap-1.5">
                <div className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                <div 
                  className="flex-1 text-sm text-gray-700 leading-relaxed hover:bg-amber-50 hover:text-amber-800 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
                  onClick={() => {
                    setEditingField('blocker');
                    setEditingIndex(index);
                  }}
                >
                  {editingField === 'blocker' && editingIndex === index ? (
                    <input
                      type="text"
                      value={blocker}
                      onChange={(e) => updateBlocker(index, e.target.value)}
                      onBlur={(e) => {
                        const newBlockers = editData.blockers.map((b, i) => i === index ? e.target.value : b);
                        handleSave('blockers', newBlockers);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newBlockers = editData.blockers.map((b, i) => i === index ? e.currentTarget.value : b);
                          handleSave('blockers', newBlockers);
                        } else if (e.key === 'Escape') {
                          setEditingField(null);
                          setEditingIndex(null);
                          setEditData(prev => ({ ...prev, blockers: [...blockers] }));
                        }
                      }}
                      placeholder="Enter a blocker..."
                      className="w-full text-sm text-gray-700 bg-transparent border-none outline-none p-0 leading-relaxed"
                      autoFocus
                    />
                  ) : (
                    <span>{blocker}</span>
                  )}
                </div>
                <button
                  onClick={() => removeBlocker(index)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-all duration-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Add blocker button */}
            <div 
              onClick={addBlocker}
              className="group flex items-center gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded px-2 py-1 -mx-2 cursor-pointer transition-all duration-200 opacity-0 hover:opacity-100"
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs">Add blocker</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 