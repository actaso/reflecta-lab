'use client';

interface CoachingHeaderProps {
  objective: string;
  progress: number; // 0-100
  estimatedTime?: string; // Optional estimated time (e.g. "25m")
  model: string; // OpenRouter model id
  onModelChange: (model: string) => void;
}

export default function CoachingHeader({ objective, progress, estimatedTime, model, onModelChange }: CoachingHeaderProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-2xl px-6 py-4 shadow-lg max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          {/* Objective and Time */}
          <div className="flex-1">
            <h2 className="text-sm font-medium text-neutral-900 leading-tight">
              {objective}
              {estimatedTime && (
                <span className="text-neutral-500">
                  <span className="mx-2">·</span>
                  {estimatedTime}
                </span>
              )}
            </h2>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-neutral-600 font-medium">
              {progress}%
            </div>
            <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Model</span>
            <select
              className="text-xs border border-neutral-200 rounded-md px-2 py-1 bg-white text-neutral-800 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
            >
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="openai/gpt-5">GPT-5</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
} 