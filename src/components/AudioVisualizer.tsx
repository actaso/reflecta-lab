"use client";

import { useRef, useEffect, useCallback } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  className?: string;
}

export default function AudioVisualizer({ 
  isRecording, 
  audioContext, // eslint-disable-line @typescript-eslint/no-unused-vars
  analyser, 
  className = "" 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate bar dimensions
    const barCount = 20;
    const barWidth = 2;
    const barSpacing = 3;
    const maxBarHeight = canvas.height - 4;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      // Sample frequency data
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const amplitude = dataArray[dataIndex] / 255;

      // Calculate bar height with some randomness for more dynamic effect
      const baseHeight = Math.max(2, amplitude * maxBarHeight);
      const randomFactor = 0.3 + Math.random() * 0.7;
      const barHeight = Math.max(2, baseHeight * randomFactor);

      const x = i * (barWidth + barSpacing);
      const y = (canvas.height - barHeight) / 2;

      // Use different shades of gray based on amplitude
      const opacity = Math.max(0.3, amplitude);
      ctx.fillStyle = `rgba(156, 163, 175, ${opacity})`;

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }

    if (isRecording) {
      animationRef.current = requestAnimationFrame(drawVisualizer);
    }
  }, [isRecording, analyser]);

  useEffect(() => {
    if (isRecording && analyser) {
      drawVisualizer();
    } else {
      // Stop animation when not recording
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRecording, analyser, drawVisualizer]);

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} width={120} height={24} className="block" />
      {!isRecording && (
        <div className="absolute inset-0 flex items-center">
          {/* Static bars when not recording */}
          <div className="flex items-center gap-[3px] h-full">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="w-[2px] bg-gray-400 rounded-sm"
                style={{
                  height: `${Math.max(2, Math.random() * 16 + 4)}px`,
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 