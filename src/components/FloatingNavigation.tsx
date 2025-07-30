'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BookOpen, MessageCircle, Settings } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavItem[] = [
  {
    id: 'journal',
    label: 'Journal',
    href: '/',
    icon: <BookOpen size={16} strokeWidth={1.5} />,
  },
  {
    id: 'coach',
    label: 'Coach',
    href: '/coach',
    icon: <MessageCircle size={16} strokeWidth={1.5} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings size={16} strokeWidth={1.5} />,
  },
];

export default function FloatingNavigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-1 fade-in duration-500">
      <nav className="flex items-center gap-1 px-1.5 py-1.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-full border border-neutral-200/40 dark:border-neutral-700/40 shadow-lg shadow-neutral-900/10 dark:shadow-neutral-900/30">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                group relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ease-out
                ${isActive 
                  ? 'bg-neutral-900/12 dark:bg-neutral-100/15 text-neutral-900 dark:text-neutral-100 shadow-sm shadow-neutral-900/10 border border-neutral-900/10 dark:border-neutral-100/10' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-900/6 dark:hover:bg-neutral-100/8 hover:shadow-sm hover:shadow-neutral-900/5'
                }
              `}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 