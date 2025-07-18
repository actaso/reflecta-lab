'use client';

import { useState } from 'react';
import { CheckSquare, Plus, X } from 'lucide-react';

interface ActionPlanCardProps {
  actions: string[];
  title?: string;
  onUpdate?: (data: { actions: string[]; title: string }) => void;
}

export default function ActionPlanCard({ actions, title = "Action Plan", onUpdate }: ActionPlanCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    actions: [...actions],
    title
  });

  const handleSave = (field: string, value: string | string[]) => {
    const newData = { ...editData, [field]: value };
    // Filter out empty actions if updating actions
    if (field === 'actions' && Array.isArray(value)) {
      newData.actions = value.filter(action => action.trim() !== '');
    }
    setEditData(newData);
    onUpdate?.(newData);
    setEditingField(null);
    setEditingIndex(null);
  };

  const updateAction = (index: number, value: string) => {
    const newActions = editData.actions.map((action, i) => i === index ? value : action);
    setEditData(prev => ({ ...prev, actions: newActions }));
  };

  const removeAction = (index: number) => {
    const newActions = editData.actions.filter((_, i) => i !== index);
    handleSave('actions', newActions);
  };

  const addAction = () => {
    const newActions = [...editData.actions, ''];
    setEditData(prev => ({ ...prev, actions: newActions }));
    setEditingIndex(newActions.length - 1);
    setEditingField('action');
  };

  return (
    <div className="w-full bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200/60 py-3 px-3 my-4 shadow-sm max-w-md">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <CheckSquare className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div 
            className="text-xs font-medium text-green-800 mb-2 hover:bg-green-50 hover:text-green-900 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
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
                className="w-full text-xs font-medium text-green-800 bg-transparent border-none outline-none p-0"
                autoFocus
              />
            ) : (
              <span>{editData.title}</span>
            )}
          </div>
          
          {/* Actions List */}
          <div className="space-y-2">
            {editData.actions.map((action, index) => (
              <div key={index} className="group flex items-start gap-2">
                <div className="text-xs font-medium text-green-700 mt-0.5 flex-shrink-0 w-4">
                  {index + 1}.
                </div>
                <div 
                  className="flex-1 text-sm text-gray-700 leading-relaxed hover:bg-green-50 hover:text-green-800 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
                  onClick={() => {
                    setEditingField('action');
                    setEditingIndex(index);
                  }}
                >
                  {editingField === 'action' && editingIndex === index ? (
                    <input
                      type="text"
                      value={action}
                      onChange={(e) => updateAction(index, e.target.value)}
                      onBlur={(e) => {
                        const newActions = editData.actions.map((a, i) => i === index ? e.target.value : a);
                        handleSave('actions', newActions);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newActions = editData.actions.map((a, i) => i === index ? e.currentTarget.value : a);
                          handleSave('actions', newActions);
                        } else if (e.key === 'Escape') {
                          setEditingField(null);
                          setEditingIndex(null);
                          setEditData(prev => ({ ...prev, actions: [...actions] }));
                        }
                      }}
                      placeholder="Enter an action step..."
                      className="w-full text-sm text-gray-700 bg-transparent border-none outline-none p-0 leading-relaxed"
                      autoFocus
                    />
                  ) : (
                    <span>{action}</span>
                  )}
                </div>
                <button
                  onClick={() => removeAction(index)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-all duration-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Add action button */}
            <div 
              onClick={addAction}
              className="group flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded px-2 py-1 -mx-2 cursor-pointer transition-all duration-200 opacity-0 hover:opacity-100"
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs">Add action</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 