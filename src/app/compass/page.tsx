'use client';

import Image from 'next/image';
import { Compass, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompassCardProps {
  title: string;
  subtitle: string;
  content: string;
  description: string;
  iconSrc: string;
  gradientClass: string;
  borderClass: string;
  textClass: string;
}

function CompassCard({ 
  title, 
  subtitle, 
  content, 
  description, 
  iconSrc, 
  gradientClass, 
  borderClass, 
  textClass 
}: CompassCardProps) {
  return (
    <div className={`w-full max-w-sm mx-auto ${gradientClass} ${borderClass} rounded-2xl p-6 shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-sm font-medium ${textClass}`}>{title}</h3>
        <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 flex items-center justify-center">
          <Image
            src={iconSrc}
            alt={title}
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
          />
        </div>
      </div>

      {/* Content */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {subtitle}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {content}
        </p>
      </div>

      {/* Description */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ExternalLink className="w-4 h-4" />
          View Sources 5+
        </button>
        <Button
          variant="default"
          size="sm"
          className="bg-black text-white hover:bg-gray-800 rounded-full px-6"
        >
          Share
        </Button>
      </div>
    </div>
  );
}

export default function CompassPage() {
  const compassData = [
    {
      id: 'focus',
      title: 'Your Main Focus',
      subtitle: 'Design transformative first-time experience.',
      content: 'Building trust and depth in first 15 minutes.',
      description: 'Updated from today\'s session.',
      iconSrc: '/focus.png',
      gradientClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
      borderClass: 'border border-blue-200',
      textClass: 'text-blue-700'
    },
    {
      id: 'blockers',
      title: 'Key Blockers',
      subtitle: 'Why the current experience falls flat.',
      content: 'Lacks emotional depth, clear insights, and structured outcome format.',
      description: 'Updated from today\'s session.',
      iconSrc: '/blockers.png',
      gradientClass: 'bg-gradient-to-br from-orange-50 to-orange-100',
      borderClass: 'border border-orange-200',
      textClass: 'text-orange-700'
    },
    {
      id: 'plan',
      title: 'Your Plan',
      subtitle: 'What to do next.',
      content: '1. Map ideal emotional journey\n2. Design trust-building opening\n3. Create insight+action template',
      description: 'Updated from today\'s session.',
      iconSrc: '/plan.png',
      gradientClass: 'bg-gradient-to-br from-green-50 to-green-100',
      borderClass: 'border border-green-200',
      textClass: 'text-green-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Compass
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your guidance from coaching sessions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Mobile Layout */}
        <div className="block lg:hidden space-y-6">
          {compassData.map((item) => (
            <CompassCard key={item.id} {...item} />
          ))}
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
          {compassData.map((item) => (
            <CompassCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
} 