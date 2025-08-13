'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Compass, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInsights } from '@/hooks/useInsights';
import { ErrorBoundary } from '@/components/error-boundaries';

interface CompassCardProps {
  title: string;
  subtitle: string;
  content: string;
  description: string;
  iconSrc: string;
  gradientClass: string;
  borderClass: string;
  textClass: string;
  sources: Array<{ quote: string; extractedAt: number }>;
  onViewSources: () => void;
}

function CompassCard({ 
  title, 
  subtitle, 
  content, 
  description, 
  iconSrc, 
  gradientClass, 
  borderClass, 
  textClass,
  sources,
  onViewSources
}: CompassCardProps) {
  return (
    <div className={`w-full max-w-sm mx-auto ${gradientClass} ${borderClass} dark:border-neutral-700 rounded-2xl p-6 shadow-lg`}>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {subtitle}
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {content}
        </p>
      </div>

      {/* Description */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onViewSources}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Sources {sources.length > 0 ? `${sources.length}` : '0'}
        </button>
        <Button
          variant="default"
          size="sm"
          className="rounded-full px-6"
        >
          Share
        </Button>
      </div>
    </div>
  );
}

// Sources Modal Component
function SourcesModal({ 
  isOpen, 
  onClose, 
  title, 
  sources 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  sources: Array<{ quote: string; extractedAt: number }>; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title} Sources</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {sources.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sources available yet.</p>
          ) : (
            sources.map((source, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 mb-2">&ldquo;{source.quote}&rdquo;</p>
                <p className="text-xs text-gray-500">
                  Extracted on {new Date(source.extractedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompassPage() {
  const { insights, loading, error, refetch, hasInsights } = useInsights();
  const router = useRouter();
  const [selectedSources, setSelectedSources] = useState<{
    title: string;
    sources: Array<{ quote: string; extractedAt: number }>;
  } | null>(null);

  // Helper function to format the last updated time
  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Updated just now';
    if (diffInHours < 24) return `Updated ${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Updated yesterday';
    return `Updated ${Math.floor(diffInHours / 24)} days ago`;
  };

  // Transform insights data into compass cards format
  const getCompassData = () => {
    if (!insights) {
      return [];
    }

    return [
      {
        id: 'focus',
        title: 'Your Main Focus',
        subtitle: insights.mainFocus.headline,
        content: insights.mainFocus.description,
        description: formatLastUpdated(insights.mainFocus.updatedAt),
        iconSrc: '/focus.png',
        gradientClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
        borderClass: 'border border-blue-200',
        textClass: 'text-blue-700',
        sources: insights.mainFocus.sources,
        onViewSources: () => setSelectedSources({
          title: 'Main Focus',
          sources: insights.mainFocus.sources
        })
      },
      {
        id: 'blockers',
        title: 'Key Blockers',
        subtitle: insights.keyBlockers.headline,
        content: insights.keyBlockers.description,
        description: formatLastUpdated(insights.keyBlockers.updatedAt),
        iconSrc: '/blockers.png',
        gradientClass: 'bg-gradient-to-br from-orange-50 to-orange-100',
        borderClass: 'border border-orange-200',
        textClass: 'text-orange-700',
        sources: insights.keyBlockers.sources,
        onViewSources: () => setSelectedSources({
          title: 'Key Blockers',
          sources: insights.keyBlockers.sources
        })
      },
      {
        id: 'plan',
        title: 'Your Plan',
        subtitle: insights.plan.headline,
        content: insights.plan.description,
        description: formatLastUpdated(insights.plan.updatedAt),
        iconSrc: '/plan.png',
        gradientClass: 'bg-gradient-to-br from-green-50 to-green-100',
        borderClass: 'border border-green-200',
        textClass: 'text-green-700',
        sources: insights.plan.sources,
        onViewSources: () => setSelectedSources({
          title: 'Plan',
          sources: insights.plan.sources
        })
      }
    ];
  };

  const compassData = getCompassData();

  return (
    <ErrorBoundary level="page" context="Compass">
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Compass className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Compass
              </h1>
            </div>
            {hasInsights && (
              <button
                onClick={refetch}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your guidance from coaching sessions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading your insights...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6 mb-8">
            <p className="text-red-700 dark:text-red-400 text-center">
              Failed to load insights: {error}
            </p>
            <div className="flex justify-center mt-4">
              <button
                onClick={refetch}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && !hasInsights && (
          <div className="text-center py-12">
            <div className="mb-6">
              <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No insights yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Complete a coaching session to generate your personalized insights and guidance.
              </p>
            </div>
            <Button
              onClick={() => router.push('/coach')}
            >
              Start Coaching Session
            </Button>
          </div>
        )}

        {!loading && !error && hasInsights && compassData.length > 0 && (
          <>
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
          </>
        )}
      </div>

      {/* Sources Modal */}
      <SourcesModal
        isOpen={selectedSources !== null}
        onClose={() => setSelectedSources(null)}
        title={selectedSources?.title || ''}
        sources={selectedSources?.sources || []}
      />
      </div>
    </ErrorBoundary>
  );
} 