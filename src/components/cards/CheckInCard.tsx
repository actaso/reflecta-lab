'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

interface CheckInCardProps {
  frequency: string;
  what?: string;
  notes?: string;
  onUpdate?: (data: { frequency: string; what: string; notes: string }) => void;
}

const FREQUENCY_OPTIONS = [
  'multiple times a day',
  'once a day',
  'throughout the week',
  'once a week'
];

export default function CheckInCard({ 
  frequency, 
  what = "", 
  notes = "",
  onUpdate
}: CheckInCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [editData, setEditData] = useState({
    frequency,
    what,
    notes
  });

  const frequencyRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSave = (field: string, value: string) => {
    const newData = { ...editData, [field]: value };
    setEditData(newData);
    onUpdate?.(newData);
    setEditingField(null);
  };

  const handleFrequencySelect = (newFrequency: string) => {
    const newData = { ...editData, frequency: newFrequency };
    setEditData(newData);
    onUpdate?.(newData);
    setShowFrequencyDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          frequencyRef.current && !frequencyRef.current.contains(event.target as Node)) {
        setShowFrequencyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200/60 py-3 px-3 my-4 shadow-sm max-w-md">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <Calendar className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-purple-800 mb-2">Check-in Agreement</div>
          
          <div className="space-y-2">
            {/* Frequency Selection */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-purple-500" />
              <div className="relative">
                <div 
                  ref={frequencyRef}
                  onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                  className="group text-sm font-medium text-gray-800 cursor-pointer hover:bg-purple-50 hover:text-purple-800 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 hover:scale-[1.02] flex items-center gap-1"
                >
                  {editData.frequency}
                  <ChevronDown className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                
                {/* Dropdown */}
                {showFrequencyDropdown && (
                  <div 
                    ref={dropdownRef}
                    className="absolute top-full left-0 mt-1 bg-white border border-purple-200 rounded-md shadow-lg z-10 min-w-[160px]"
                  >
                    {FREQUENCY_OPTIONS.map(option => (
                      <div
                        key={option}
                        onClick={() => handleFrequencySelect(option)}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 first:rounded-t-md last:rounded-b-md transition-colors duration-150 ${
                          option === editData.frequency ? 'bg-purple-100 text-purple-800 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* What to check-in about */}
            {(what || editingField === 'what') && (
              <div 
                className="text-xs text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 cursor-text"
                onClick={() => setEditingField('what')}
              >
                {editingField === 'what' ? (
                  <input
                    type="text"
                    value={editData.what}
                    onChange={(e) => setEditData(prev => ({ ...prev, what: e.target.value }))}
                    onBlur={(e) => handleSave('what', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSave('what', e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditData(prev => ({ ...prev, what }));
                      }
                    }}
                    placeholder="What to check-in about (e.g., morning routine progress, energy levels)"
                    className="w-full text-xs text-gray-600 bg-transparent border-none outline-none p-0"
                    autoFocus
                  />
                ) : (
                  <span>Check-in about: {editData.what}</span>
                )}
              </div>
            )}
            
            {/* Add what option */}
            {!what && !editingField && (
              <div 
                onClick={() => setEditingField('what')}
                className="text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded px-2 py-1 -mx-2 cursor-pointer transition-all duration-200 opacity-0 hover:opacity-100"
              >
                + What to check-in about
              </div>
            )}
            

            {/* Notes */}
            {(notes || editingField === 'notes') && (
              <div 
                className="text-xs text-gray-600 leading-relaxed pt-1 border-t border-purple-100 hover:bg-purple-50 rounded px-2 py-1 -mx-2 transition-all duration-200 cursor-text"
                onClick={() => setEditingField('notes')}
              >
                {editingField === 'notes' ? (
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    onBlur={(e) => handleSave('notes', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditData(prev => ({ ...prev, notes }));
                      }
                    }}
                    placeholder="Additional notes..."
                    className="w-full text-xs text-gray-600 bg-transparent border-none outline-none p-0 leading-relaxed min-h-[40px] resize-none"
                    autoFocus
                  />
                ) : (
                  <span>{editData.notes}</span>
                )}
              </div>
            )}
            

          </div>
        </div>
      </div>
    </div>
  );
} 