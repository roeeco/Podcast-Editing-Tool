import React, { useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Clock, Play, Pause } from 'lucide-react';
import { PodcastTrack } from '../types';

interface TrackTimelineProps {
  track: PodcastTrack;
  onTrimChange: (id: string, start: number, end: number) => void;
  onChangeField?: (id: string, field: 'fadeInDuration' | 'fadeOutDuration' | 'silenceAfter', value: number) => void;
  isDarkMode: boolean;
}

export const TrackTimeline: React.FC<TrackTimelineProps> = ({ 
  track, 
  onTrimChange, 
  onChangeField, 
  isDarkMode 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePopover, setActivePopover] = useState<'fadeIn' | 'fadeOut' | 'silence' | null>(null);

  // Generate unique waveform heights based on the track's id or use real cached peaks
  const waveformBars = useMemo(() => {
    const count = 60;
    if (track.isSilence) {
      return Array.from({ length: count }, () => 2); // flat line for silence
    }
    if (track.peaks && track.peaks.length > 0) {
      // Scale peaks (0..1) to 15..90% for visual aesthetics
      return track.peaks.map(p => Math.max(15, Math.min(90, p * 85 + 15)));
    }

    const seed = track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: count }, (_, i) => {
      // Use a combination of sine waves for a natural pseudo-random look as a fallback
      const height = Math.abs(
        Math.sin(i * 0.2 + seed) * 50 + 
        Math.sin(i * 0.5) * 30 + 
        Math.cos(i * 0.1) * 10
      );
      return Math.max(15, Math.min(90, height)); // Clamp between 15% and 90%
    });
  }, [track.id, track.peaks, track.isSilence]);

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

  // Fade In and Fade Out visual widths as percent of track duration
  const fadeInWidthPercent = useMemo(() => {
    if (!track.fadeInDuration) return 0;
    const rawPercent = (track.fadeInDuration / track.duration) * 100;
    return Math.min(endPercent - startPercent, rawPercent);
  }, [track.fadeInDuration, track.duration, startPercent, endPercent]);

  const fadeOutWidthPercent = useMemo(() => {
    if (!track.fadeOutDuration) return 0;
    const rawPercent = (track.fadeOutDuration / track.duration) * 100;
    return Math.min(endPercent - startPercent - fadeInWidthPercent, rawPercent);
  }, [track.fadeOutDuration, track.duration, startPercent, endPercent, fadeInWidthPercent]);

  // Theme variable configurations
  const themeBg = isDarkMode ? 'bg-zinc-950/60' : 'bg-zinc-200/55';
  const themeActiveBarColor = isDarkMode ? 'bg-zinc-300' : 'bg-zinc-700';
  const themeInactiveBarColor = isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300';
  const themeOverlayBg = isDarkMode ? 'bg-zinc-900/85' : 'bg-zinc-100/90';
  const themeActiveAreaBorder = isDarkMode ? 'border-zinc-500/30 bg-zinc-800/5' : 'border-zinc-600/20 bg-zinc-400/5';
  const themeLabelBg = isDarkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 shadow-sm border-zinc-300';

  return (
    <div className="flex flex-col w-full pb-9 relative">
      {/* Click Outside Popover Dismissal Backdrop */}
      {activePopover && (
        <div 
          className="fixed inset-0 z-20 cursor-default" 
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(null);
          }}
        />
      )}

      {/* Waveform and Trimming Handles Container */}
      <div 
        ref={containerRef}
        className={`relative w-full h-14 ${themeBg} rounded-xl overflow-visible select-none mt-1.5 flex items-center border ${
          isDarkMode ? 'border-zinc-800/55' : 'border-zinc-300/60'
        }`}
      >
        {/* Background stylized grid lines for depth */}
        <div className="absolute inset-0 grid grid-cols-6 h-full w-full opacity-5 pointer-events-none">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="border-r border-current h-full" />
          ))}
        </div>

        {/* Muted background wave bars */}
        <div className="absolute inset-x-0 h-10 flex items-center justify-between px-4 pointer-events-none">
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

        {/* Visual Fade-In Triangle Overlay */}
        {fadeInWidthPercent > 0 && (
          <div 
            className="absolute top-0 bottom-0 bg-gradient-to-l from-emerald-500/25 to-transparent pointer-events-none z-10"
            style={{
              right: `${startPercent}%`,
              width: `${fadeInWidthPercent}%`,
            }}
          />
        )}

        {/* Visual Fade-Out Triangle Overlay */}
        {fadeOutWidthPercent > 0 && (
          <div 
            className="absolute top-0 bottom-0 bg-gradient-to-r from-red-500/25 to-transparent pointer-events-none z-10"
            style={{
              left: `${100 - endPercent}%`,
              width: `${fadeOutWidthPercent}%`,
            }}
          />
        )}

        {/* Active high-contrast area box with border outline */}
        <div 
          className={`absolute top-0 bottom-0 border-y-2 ${themeActiveAreaBorder} pointer-events-none transition-all`}
          style={{
            right: `${startPercent}%`,
            left: `${100 - endPercent}%`
          }}
        />

        {/* --- FADE IN / FADE OUT OVERLAY PILLS DIRECTLY ON THE WAVEFORM --- */}
        {onChangeField && !track.isSilence && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
            {/* Fade In Pill */}
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ right: `calc(${startPercent}% + 6px)` }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover(activePopover === 'fadeIn' ? null : 'fadeIn');
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md cursor-pointer border backdrop-blur transition-all hover:scale-105 active:scale-95 ${
                  track.fadeInDuration
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                }`}
                title="הגדר כניסה רכה (Fade In)"
              >
                <Sliders className="w-2.5 h-2.5 text-emerald-500" />
                <span>In: {track.fadeInDuration ? `${track.fadeInDuration}s` : '0s'}</span>
              </button>

              {/* Fade In Popover */}
              <AnimatePresence>
                {activePopover === 'fadeIn' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className={`absolute top-full mt-2 right-0 z-30 p-3 rounded-xl shadow-xl border flex flex-col gap-2 min-w-[180px] ${
                      isDarkMode ? 'bg-[#18181f] border-zinc-700/80 text-white' : 'bg-white border-zinc-200 text-zinc-950'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>כניסה רכה (Fade In)</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => setActivePopover(null)} 
                        className="text-xs text-zinc-400 hover:text-zinc-200 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={track.fadeInDuration || 0}
                        onChange={(e) => {
                          onChangeField(track.id, 'fadeInDuration', Number(e.target.value));
                        }}
                        className="w-full h-1 accent-emerald-500 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-[11px] font-bold shrink-0">
                        {(track.fadeInDuration || 0).toFixed(1)} ש'
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fade Out Pill */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `calc(${100 - endPercent}% + 6px)` }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover(activePopover === 'fadeOut' ? null : 'fadeOut');
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md cursor-pointer border backdrop-blur transition-all hover:scale-105 active:scale-95 ${
                  track.fadeOutDuration
                    ? 'bg-red-500/15 border-red-500 text-red-400'
                    : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                }`}
                title="הגדר יציאה רכה (Fade Out)"
              >
                <Sliders className="w-2.5 h-2.5 text-red-400" />
                <span>Out: {track.fadeOutDuration ? `${track.fadeOutDuration}s` : '0s'}</span>
              </button>

              {/* Fade Out Popover */}
              <AnimatePresence>
                {activePopover === 'fadeOut' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className={`absolute top-full mt-2 left-0 z-30 p-3 rounded-xl shadow-xl border flex flex-col gap-2 min-w-[180px] ${
                      isDarkMode ? 'bg-[#18181f] border-zinc-700/80 text-white' : 'bg-white border-zinc-200 text-zinc-950'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold flex items-center gap-1.5 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>יציאה רכה (Fade Out)</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => setActivePopover(null)} 
                        className="text-xs text-zinc-400 hover:text-zinc-200 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={track.fadeOutDuration || 0}
                        onChange={(e) => {
                          onChangeField(track.id, 'fadeOutDuration', Number(e.target.value));
                        }}
                        className="w-full h-1 accent-red-500 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-[11px] font-bold shrink-0">
                        {(track.fadeOutDuration || 0).toFixed(1)} ש'
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* --- START DRAG HANDLE (Right edge of active) --- */}
        <div 
          className="absolute top-full z-20 flex flex-col items-end group cursor-ew-resize select-none"
          style={{ right: `${startPercent}%` }}
          onMouseDown={(e) => startDrag('start', e)}
          onTouchStart={(e) => startTouchDrag('start', e)}
        >
          <div className={`mt-1 px-2 py-0.5 ${themeLabelBg} shadow rounded-md flex items-center gap-1 transition-transform group-hover:scale-105 group-active:scale-95 border`}>
            <span className="text-[8px] font-bold uppercase opacity-60">התחלה</span>
            <span className="text-[10px] font-bold">{track.trimStart.toFixed(1)}s</span>
          </div>
        </div>

        {/* --- END DRAG HANDLE (Left edge of active) --- */}
        <div 
          className="absolute top-full z-20 flex flex-col items-start group cursor-ew-resize select-none"
          style={{ left: `${100 - endPercent}%` }}
          onMouseDown={(e) => startDrag('end', e)}
          onTouchStart={(e) => startTouchDrag('end', e)}
        >
          <div className={`mt-1 px-2 py-0.5 ${themeLabelBg} shadow rounded-md flex items-center gap-1 transition-transform group-hover:scale-105 group-active:scale-95 border`}>
            <span className="text-[10px] font-bold">{track.trimEnd.toFixed(1)}s</span>
            <span className="text-[8px] font-bold uppercase opacity-60">סיום</span>
          </div>
        </div>
      </div>
    </div>
  );
};
