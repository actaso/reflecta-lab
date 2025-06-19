'use client';

import { useState, useEffect, useRef } from 'react';

export default function JournalApp() {
  const [selectedDate, setSelectedDate] = useState('2023-10-04');
  const [entries, setEntries] = useState<Record<string, string>>({
    '2023-10-04': '',
    '2023-10-03': 'Had a great meeting with the team today...',
    '2023-10-02': 'Worked on the new feature implementation.',
  });
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Generate dates for the sidebar (last 30 days + next 7 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date('2023-10-04'); // Using the date from your design
    
    // Previous 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    // Next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const dates = generateDates();
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleEntryChange = (value: string) => {
    setEntries(prev => ({
      ...prev,
      [selectedDate]: value
    }));
  };

  // Scroll-hijacking: Auto-select date based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current) return;

      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const triggerPoint = sidebarRect.top + 120; // Trigger when item is near top third

      // Find which date element is at the trigger point
      for (const date of dates) {
        const dateKey = formatDate(date);
        const element = dateRefs.current[dateKey];
        
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const elementCenter = elementRect.top + elementRect.height / 2;
          
          // Check if this element is close to our trigger point
          if (Math.abs(elementCenter - triggerPoint) < 30) {
            if (selectedDate !== dateKey) {
              setSelectedDate(dateKey);
            }
            break;
          }
        }
      }
    };

    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('scroll', handleScroll, { passive: true });
      return () => sidebar.removeEventListener('scroll', handleScroll);
    }
  }, [dates, selectedDate]);

  return (
    <div className="flex h-screen bg-neutral-50 font-[family-name:var(--font-geist-sans)]">
      {/* Left Sidebar - Completely seamless */}
      <div 
        ref={sidebarRef}
        className="w-64 bg-neutral-50 flex flex-col overflow-y-auto py-8"
      >
        <div className="px-6 space-y-2">
          {dates.map((date) => {
            const dateKey = formatDate(date);
            const isSelected = dateKey === selectedDate;
            
            return (
              <div
                key={dateKey}
                ref={(el) => {
                  dateRefs.current[dateKey] = el;
                }}
                onClick={() => setSelectedDate(dateKey)}
                className={`cursor-pointer py-1 transition-colors duration-200 ${
                  isSelected 
                    ? 'text-black' 
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <div className="text-sm font-normal">
                  {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area - Seamless continuation */}
      <div className="flex-1 bg-neutral-50 flex flex-col">
        {/* Header with date and orange line - exact match to screenshot */}
        <div className="pt-8 px-8 pb-4">
          <div className="flex items-center">
            <h1 className="text-base text-black font-normal">
              {formatDisplayDate(new Date(selectedDate))}
            </h1>
            <div className="ml-3 w-6 h-[2px] bg-orange-500"></div>
          </div>
        </div>
        
        {/* Writing area - exactly like screenshot */}
        <div className="flex-1 px-8 pb-8">
          <textarea
            value={entries[selectedDate] || ''}
            onChange={(e) => handleEntryChange(e.target.value)}
            placeholder="Start writing, hit ? to ask questions..."
            className="w-full h-full resize-none border-none outline-none text-black placeholder-neutral-400 bg-transparent text-base leading-relaxed font-[family-name:var(--font-geist-sans)]"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
