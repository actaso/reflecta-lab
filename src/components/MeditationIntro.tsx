'use client';

interface MeditationIntroProps {
  onStartMeditation: () => void;
}

export default function MeditationIntro({ onStartMeditation }: MeditationIntroProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Welcome header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to your Life Deep Dive
          </h1>
          <p className="text-lg text-gray-600">
            Your first reflective coaching session with Reflecta
          </p>
        </div>

        {/* Session overview */}
        <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">What to expect</h2>
          
          <div className="grid gap-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-600 text-sm font-medium">⏱</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">25 minutes</p>
                                  <p className="text-sm text-gray-600">A focused session to explore what&apos;s most alive in you right now</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-600 text-sm font-medium">🧘</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Start with centering</p>
                                  <p className="text-sm text-gray-600">A 5-minute guided breathing exercise to connect with what&apos;s present</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-600 text-sm font-medium">💭</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Deep reflection</p>
                <p className="text-sm text-gray-600">Explore tensions, longings, and what wants to emerge in your life</p>
              </div>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="space-y-4">
          <button
            onClick={onStartMeditation}
            className="w-full bg-indigo-600 text-white py-4 px-8 rounded-xl font-medium text-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Begin with centering
          </button>
          <p className="text-sm text-gray-500">
            Take your time—there&apos;s no rush. When you&apos;re ready, we&apos;ll start together.
          </p>
        </div>
      </div>
    </div>
  );
} 