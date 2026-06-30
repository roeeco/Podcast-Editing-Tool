import React, { useRef, useMemo } from 'react';
import { PodcastTrack } from '../types';

interface TrackTimelineProps {
  track: PodcastTrack;
  onTrimChange: (id: string, start: number, end: number) => void;
  isDarkMode: boolean;
}

export const TrackTimeline: React.FC<TrackTimelineProps> = ({ track, onTrimChange, isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique waveform heights based on the track's id so each track has its own character
  const waveformBars = useMemo(() => {
    const seed = track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const count = 60;
    return Array.from({ length: count }, (_, i) => {
      // Use a combination of sine waves for a natural pseudo-random look
      const height = Math.abs(
        Math.sin(i * 0.2 + seed) * 50 + 
        Math.sin(i * 0.5) * 30 + 
        Math.cos(i * 0.1) * 10
      );
      return Math.max(15, Math.min(90, height)); // Clamp between 15% and 90%
    });
  }, [track.id]);

  // Handle Dragging calculations
  const calculateTimeFromClientX = (clientX: number): number => {
    const container = containerRef.current;
    if (!container) return 0;

    const rect = container.getBoundingClientRect();
    // RTL layout: right side is 0 seconds, left side is duration seconds
    const relativeX = rect.right - clientX;
    let ratio = relativeX / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    return ratio * track.duration;
  };

  const startDrag = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newTime = calculateTimeFromClientX(moveEvent.clientX);
      if (type === 'start') {
        const updatedStart = Math.min(track.trimEnd - 0.1, Number(newTime.toFixed(1)));
        onTrimChange(track.id, updatedStart, track.trimEnd);
      } else {
        const updatedEnd = Math.max(track.trimStart + 0.1, Number(newTime.toFixed(1)));
        onTrimChange(track.id, track.trimStart, updatedEnd);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startTouchDrag = (type: 'start' | 'end', e: React.TouchEvent) => {
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      const newTime = calculateTimeFromClientX(moveEvent.touches[0].clientX);
      if (type === 'start') {
        const updatedStart = Math.min(track.trimEnd - 0.1, Number(newTime.toFixed(1)));
        onTrimChange(track.id, updatedStart, track.trimEnd);
      } else {
        const updatedEnd = Math.max(track.trimStart + 0.1, Number(newTime.toFixed(1)));
        onTrimChange(track.id, track.trimStart, updatedEnd);
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Convert time to percentage from the right edge
  const startPercent = (track.trimStart / track.duration) * 100;
  const endPercent = (track.trimEnd / track.duration) * 100;

  // Theme variable configurations
  const themeBg = isDarkMode ? 'bg-zinc-950' : 'bg-zinc-200/50';
  const themeActiveBarColor = isDarkMode ? 'bg-zinc-300' : 'bg-zinc-700';
  const themeInactiveBarColor = isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300';
  const themeOverlayBg = isDarkMode ? 'bg-zinc-900/85' : 'bg-zinc-100/90';
  const themeActiveAreaBorder = isDarkMode ? 'border-zinc-500/40 bg-zinc-800/10' : 'border-zinc-600/30 bg-zinc-400/10';
  const themeKnobBg = isDarkMode ? 'bg-zinc-900 border-zinc-300' : 'bg-white border-zinc-800';
  const themeKnobDot = isDarkMode ? 'bg-zinc-100' : 'bg-zinc-900';
  const themeLabelBg = isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900 shadow-sm';
  const themeTextMuted = isDarkMode ? 'text-zinc-400' : 'text-zinc-600';
  const themeInputBg = isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-200/70 text-zinc-900';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Waveform and Trimming Handles Container */}
      <div 
        ref={containerRef}
        className={`relative w-full h-20 ${themeBg} rounded-xl overflow-visible select-none mt-2 flex items-center`}
      >
        {/* Background stylized grid lines for depth */}
        <div className="absolute inset-0 grid grid-cols-6 h-full w-full opacity-5 pointer-events-none">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="border-r border-current h-full" />
          ))}
        </div>

        {/* Muted background wave bars */}
        <div className="absolute inset-x-0 h-12 flex items-center justify-between px-4 pointer-events-none">
          {waveformBars.map((height, idx) => {
            const barRatio = idx / waveformBars.length;
            const barTime = barRatio * track.duration;
            const isActive = barTime >= track.trimStart && barTime <= track.trimEnd;

            return (
              <div
                key={idx}
                className={`w-[2.5px] rounded-full transition-colors duration-150 ${
                  isActive 
                    ? `${themeActiveBarColor} h-full` 
                    : `${themeInactiveBarColor} h-1/3 opacity-40`
                }`}
                style={{ height: `${isActive ? height : height / 2.2}%` }}
              />
            );
          })}
        </div>

        {/* Trimmed start overlay (right side buffer) */}
        <div 
          className={`absolute right-0 top-0 bottom-0 ${themeOverlayBg} transition-all rounded-r-xl`}
          style={{ width: `${startPercent}%` }}
        >
          <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[0.5px]" />
        </div>

        {/* Trimmed end overlay (left side buffer) */}
        <div 
          className={`absolute left-0 top-0 bottom-0 ${themeOverlayBg} transition-all rounded-l-xl`}
          style={{ width: `${100 - endPercent}%` }}
        >
          <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[0.5px]" />
        </div>

        {/* Active high-contrast area box with border outline */}
        <div 
          className={`absolute top-0 bottom-0 border-y-2 ${themeActiveAreaBorder} pointer-events-none transition-all`}
          style={{
            right: `${startPercent}%`,
            left: `${100 - endPercent}%`
          }}
        />

        {/* --- START DRAG HANDLE (Right edge of active) --- */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -mr-4 z-20 flex flex-col items-center group cursor-ew-resize select-none"
          style={{ right: `${startPercent}%` }}
          onMouseDown={(e) => startDrag('start', e)}
          onTouchStart={(e) => startTouchDrag('start', e)}
        >
          {/* Time display indicator above */}
          <span className={`absolute -top-8 text-xs font-bold ${themeLabelBg} px-2 py-1 rounded shadow-md pointer-events-none select-none transition-transform group-hover:scale-105`}>
            {track.trimStart.toFixed(1)}s
          </span>

          {/* Elegant Circular Knob with Inner Glow */}
          <div className={`w-8 h-8 rounded-full ${themeKnobBg} shadow-md flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95`}>
            <div className={`w-2.5 h-2.5 rounded-full ${themeKnobDot}`} />
          </div>

          {/* Indicator Label */}
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1.5 select-none pointer-events-none bg-zinc-500/10 px-1.5 py-0.5 rounded">
            התחלה
          </span>
        </div>

        {/* --- END DRAG HANDLE (Left edge of active) --- */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -ml-4 z-20 flex flex-col items-center group cursor-ew-resize select-none"
          style={{ right: `${endPercent}%` }}
          onMouseDown={(e) => startDrag('end', e)}
          onTouchStart={(e) => startTouchDrag('end', e)}
        >
          {/* Time display indicator above */}
          <span className={`absolute -top-8 text-xs font-bold ${themeLabelBg} px-2 py-1 rounded shadow-md pointer-events-none select-none transition-transform group-hover:scale-105`}>
            {track.trimEnd.toFixed(1)}s
          </span>

          {/* Elegant Circular Knob with Inner Glow */}
          <div className={`w-8 h-8 rounded-full ${themeKnobBg} shadow-md flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95`}>
            <div className={`w-2.5 h-2.5 rounded-full ${themeKnobDot}`} />
          </div>

          {/* Indicator Label */}
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1.5 select-none pointer-events-none bg-zinc-500/10 px-1.5 py-0.5 rounded">
            סיום
          </span>
        </div>
      </div>

      {/* Manual precise number inputs underneath as requested helper */}
      <div className={`flex items-center justify-between gap-4 px-1 mt-1 text-sm ${themeTextMuted}`}>
        <div className="flex items-center gap-2">
          <span>זמן חיתוך התחלה:</span>
          <input
            type="number"
            min="0"
            max={track.trimEnd - 0.1}
            step="0.1"
            value={Number(track.trimStart.toFixed(1))}
            onChange={(e) => {
              const val = Math.max(0, Math.min(track.trimEnd - 0.1, Number(e.target.value)));
              onTrimChange(track.id, val, track.trimEnd);
            }}
            className={`w-16 ${themeInputBg} rounded px-2 py-1 text-center font-bold text-sm focus:outline-none`}
          />
          <span>שניות</span>
        </div>

        <div className="flex items-center gap-2">
          <span>זמן חיתוך סיום:</span>
          <input
            type="number"
            min={track.trimStart + 0.1}
            max={track.duration}
            step="0.1"
            value={Number(track.trimEnd.toFixed(1))}
            onChange={(e) => {
              const val = Math.max(track.trimStart + 0.1, Math.min(track.duration, Number(e.target.value)));
              onTrimChange(track.id, track.trimStart, val);
            }}
            className={`w-16 ${themeInputBg} rounded px-2 py-1 text-center font-bold text-sm focus:outline-none`}
          />
          <span>שניות</span>
        </div>
      </div>
    </div>
  );
};
