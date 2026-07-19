import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileAudio,
  GripVertical,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  VolumeX,
  Volume2,
  Trash2,
  Sliders,
  Plus,
  Clock,
  Download,
  Music,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { PodcastTrack } from '../types';
import { TrackTimeline } from './TrackTimeline';

interface TrackListProps {
  tracks: PodcastTrack[];
  setTracks: React.Dispatch<React.SetStateAction<PodcastTrack[]>>;
  playingTrackId: string | null;
  playingFullTrackId: string | null;
  playIndividualFullTrack: (track: PodcastTrack) => void;
  playIndividualTrackSegment: (track: PodcastTrack) => void;
  updateTrackField: (id: string, field: keyof PodcastTrack, value: any) => void;
  updateTrackTrim: (id: string, trimStart: number, trimEnd: number) => void;
  handleDeleteTrack: (id: string) => void;
  setIsFreesoundModalOpen: (val: boolean) => void;
  isDarkMode: boolean;
  
  // Merge state
  isMerging: boolean;
  isCompressing: boolean;
  compressProgress: number;
  hasUnmergedChanges: boolean;
  mergePodcastTracks: () => void;
  mergedUrl: string | null;
  mergedDuration: number;
  exportFormat: 'wav' | 'webm';
  setExportFormat: (val: 'wav' | 'webm') => void;
  useCrossfade: boolean;
  setUseCrossfade: (val: boolean) => void;
  useNormalization: boolean;
  setUseNormalization: (val: boolean) => void;
  useDucking: boolean;
  setUseDucking: (val: boolean) => void;
  toggleMergedAudio: () => void;
  isMergedPlayerPlaying: boolean;

  trimPreviewPosition: {
    trackId: string;
    time: number;
  } | null;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  setTracks,
  playingTrackId,
  playingFullTrackId,
  playIndividualFullTrack,
  playIndividualTrackSegment,
  updateTrackField,
  updateTrackTrim,
  handleDeleteTrack,
  setIsFreesoundModalOpen,
  isDarkMode,
  
  // Merge props
  isMerging,
  isCompressing,
  compressProgress,
  hasUnmergedChanges,
  mergePodcastTracks,
  mergedUrl,
  mergedDuration,
  exportFormat,
  setExportFormat,
  useCrossfade,
  setUseCrossfade,
  useNormalization,
  setUseNormalization,
  useDucking,
  setUseDucking,
  toggleMergedAudio,
  isMergedPlayerPlaying,
  trimPreviewPosition,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>({});
  const [isAdvancedOptionsExpanded, setIsAdvancedOptionsExpanded] = useState<boolean>(false);

  const handleAddSilenceTrack = () => {
    const newTrack: PodcastTrack = {
      id: `silence-${Date.now()}`,
      name: 'מרווח שקט',
      duration: 15,
      trimStart: 0,
      trimEnd: 3,
      volume: 0,
      isSilence: true,
      isEffect: true,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  // Drag and drop reordering handler
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setTracks((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setTracks((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === tracks.length - 1) return;
    setTracks((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(remainingSecs)}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* Tracks List */}
      <div className={`rounded-2xl p-6 shadow-xl flex flex-col gap-5 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#2d2d37]/45 border border-zinc-700/20' : 'bg-white'
      }`}>
        
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-zinc-500" />
            <h3 className="text-lg font-bold">רשימת רצועות</h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            isDarkMode ? 'bg-[#373743] text-zinc-300' : 'bg-zinc-200 text-zinc-800'
          }`}>
            {tracks.length} רצועות
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="py-12 px-4 border-2 border-dashed border-zinc-700/30 rounded-xl flex flex-col items-center justify-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              isDarkMode ? 'bg-[#1c1c22] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
            }`}>
              <Sliders className="w-6 h-6 animate-pulse text-indigo-500" />
            </div>
            <h4 className={`text-base font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>אין קטעי קול בפרויקט</h4>
            <p className={`text-sm max-w-sm leading-normal mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              השתמש/י בכפתורי ההקלטה למעלה או העלה/י קבצים קיימים כדי להתחיל לערוך ולמזג את ההסכת שלך.
            </p>
            <button
              id="add-music-empty-btn"
              onClick={() => setIsFreesoundModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף פתיח, מעבר או אפקט מוזיקלי (Freesound)</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {tracks.map((track, index) => {
              const isPlaying = playingTrackId === track.id;
              const isBeingDragged = draggedIndex === index;
              const isHoveredOver = dragOverIndex === index && draggedIndex !== index;

              return (
                <motion.div
                  key={track.id}
                  layoutId={track.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(index);
                  }}
                  className={`p-5 rounded-xl transition-all flex flex-col gap-4 relative select-none ${
                    isBeingDragged
                      ? 'opacity-30 border-2 border-dashed border-zinc-500 bg-[#121216]/50 scale-[0.99]'
                      : isHoveredOver
                      ? 'bg-zinc-800/10 scale-[1.01] shadow-lg'
                      : (isDarkMode ? 'bg-[#373743] text-zinc-100 shadow-sm border border-zinc-700/20' : 'bg-zinc-100/70 text-zinc-900')
                  }`}
                >
                  {/* Drag Edge Handle indicator */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1.5 rounded-r-xl pointer-events-none ${
                    track.isEffect 
                      ? (isDarkMode ? 'bg-purple-500' : 'bg-purple-400')
                      : (isDarkMode ? 'bg-[#ffcc00]' : 'bg-zinc-400')
                  }`} />

                  {/* Mobile Compact Card View */}
                  <div className="sm:hidden flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      {/* Play & Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => playIndividualFullTrack(track)}
                          className={`p-2 rounded-lg shrink-0 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] ${
                            playingFullTrackId === track.id
                              ? 'bg-[#ffcc00] text-zinc-950 shadow animate-pulse'
                              : (isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-700 shadow-sm')
                          }`}
                        >
                          {playingFullTrackId === track.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <input
                          type="text"
                          value={track.name}
                          onChange={(e) => updateTrackField(track.id, 'name', e.target.value)}
                          className={`rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none w-full truncate ${
                            isDarkMode ? 'bg-zinc-800 text-white' : 'bg-zinc-150 text-zinc-900 shadow-sm'
                          }`}
                        />
                      </div>

                      {/* Expand & Delete & Details */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Volume summary / Duration indicators */}
                        <div className="flex flex-col text-[10px] text-zinc-400 font-mono text-left leading-tight px-1">
                          <span>⏱️ {formatTime(track.duration)}ש׳</span>
                          <span>🔊 {Math.round(track.volume * 100)}%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTracks(prev => {
                              const isCurrentlyExpanded = !!prev[track.id];
                              // Only one track expanded at a time on mobile
                              return {
                                [track.id]: !isCurrentlyExpanded
                              };
                            });
                          }}
                          className={`p-2 rounded-lg transition-all border flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] ${
                            expandedTracks[track.id]
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                              : (isDarkMode ? 'bg-[#2d2d37]/80 border-transparent text-zinc-400' : 'bg-zinc-200 border-transparent text-zinc-600')
                          }`}
                          title={expandedTracks[track.id] ? "צמצם אפשרויות" : "הרחב לעריכה"}
                        >
                          {expandedTracks[track.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTrack(track.id)}
                          className={`p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            isDarkMode ? 'bg-red-950/40 text-red-400' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Header: editable name, full player, volume, delete */}
                  <div className={`flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pr-2 ${
                    expandedTracks[track.id] ? 'flex' : 'hidden sm:flex'
                  }`}>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                      {/* Drag handles */}
                      <div 
                        title="גרור למעלה או למטה כדי לשנות סדר" 
                        draggable
                        onDragStart={(e) => {
                          setDraggedIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`p-2 rounded-lg text-zinc-500 cursor-grab active:cursor-grabbing transition-colors shrink-0 flex items-center justify-center ${
                          isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351]' : 'bg-zinc-200 hover:bg-zinc-300 shadow-sm'
                        }`}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Raw Full Audio Player button */}
                      <button
                        type="button"
                        onClick={() => playIndividualFullTrack(track)}
                        title={playingFullTrackId === track.id ? "עצור השמעת רצועה מלאה" : "השמע רצועה מלאה מההתחלה"}
                        className={`p-2 rounded-lg transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          playingFullTrackId === track.id
                            ? 'bg-[#ffcc00] text-zinc-950 font-bold shadow animate-pulse'
                            : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 shadow-sm')
                        }`}
                      >
                        {playingFullTrackId === track.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>

                      <input
                        type="text"
                        value={track.name}
                        onChange={(e) => updateTrackField(track.id, 'name', e.target.value)}
                        className={`rounded-lg px-3 py-1.5 text-base font-bold focus:outline-none w-full max-w-md ${
                          isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-white focus:ring-1 focus:ring-zinc-700' : 'bg-zinc-200 hover:bg-zinc-150 text-zinc-900 focus:ring-1 focus:ring-zinc-300 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* Move & volume controls */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        title="הזז למעלה"
                        className={`p-2 rounded-lg transition-all ${
                          isDarkMode 
                            ? 'bg-[#2d2d37] hover:bg-[#434351] disabled:opacity-40 text-zinc-400' 
                            : 'bg-zinc-200 hover:bg-zinc-300 disabled:opacity-40 text-zinc-700 shadow-sm'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === tracks.length - 1}
                        title="הזז למטה"
                        className={`p-2 rounded-lg transition-all ${
                          isDarkMode 
                            ? 'bg-[#2d2d37] hover:bg-[#434351] disabled:opacity-40 text-zinc-400' 
                            : 'bg-zinc-200 hover:bg-zinc-300 disabled:opacity-40 text-zinc-700 shadow-sm'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                        isDarkMode ? 'bg-[#2d2d37]' : 'bg-zinc-200 shadow-sm'
                      }`}>
                        <span title="ווליום">
                          {track.volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <Volume2 className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`} />
                          )}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) => updateTrackField(track.id, 'volume', Number(e.target.value))}
                          className="w-16 h-1 accent-[#ffcc00] bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className={`font-bold text-xs min-w-8 text-left ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                          {Math.round(track.volume * 100)}%
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        title="מחק רצועה"
                        className={`p-2 rounded-lg transition-all ${
                          isDarkMode 
                            ? 'bg-red-950/40 hover:bg-red-900/30 text-red-400' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Waveform and Controls */}
                  <div className={`p-4 rounded-xl flex-col gap-3.5 ${
                    expandedTracks[track.id] ? 'flex' : 'hidden sm:flex'
                  } ${
                    isDarkMode ? 'bg-[#1c1c22]/30' : 'bg-zinc-200/40'
                  }`}>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <TrackTimeline
                          track={track}
                          onTrimChange={updateTrackTrim}
                          isDarkMode={isDarkMode}
                          isPreviewing={trimPreviewPosition?.trackId === track.id}
                          playheadTime={
                            trimPreviewPosition?.trackId === track.id
                              ? trimPreviewPosition.time
                              : null
                          }
                        />
                      </div>

                      {/* Streamlined buttons directly beside the waveform */}
                      <div className="flex md:flex-col items-stretch sm:items-center justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-r border-zinc-700/10 pt-3 md:pt-0 md:pr-4 min-w-[150px]">
                        {/* Trim segment play preview */}
                        <button
                          type="button"
                          onClick={() => playIndividualTrackSegment(track)}
                          title={isPlaying ? "עצור השמעה" : "האזן לקטע החתוך"}
                          className={`w-full px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                            isPlaying
                              ? 'bg-[#ffcc00] text-zinc-950 shadow animate-pulse'
                              : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 shadow-sm')
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isPlaying ? "עצור השמעה" : "האזן לקטע החתוך"}</span>
                        </button>

                        {/* Collapsible transition options toggler */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTracks(prev => ({
                              ...prev,
                              [track.id]: !prev[track.id]
                            }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border shrink-0 ${
                            expandedTracks[track.id]
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                              : (isDarkMode ? 'bg-[#2d2d37] border-transparent hover:bg-[#434351] text-zinc-400 hover:text-white' : 'bg-zinc-200 border-transparent hover:bg-zinc-300 text-zinc-600 hover:text-zinc-900 shadow-sm')
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                          <span>אפשרויות מעברים</span>
                          {expandedTracks[track.id] ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible individual transition controls (Fade In, Out, Silence gap) */}
                    <AnimatePresence initial={false}>
                      {expandedTracks[track.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 mt-1 border-t border-zinc-700/5">
                            {/* Fade In Duration */}
                            <div className="flex flex-col gap-1.5">
                              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>כניסה רכה (Fade In):</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={track.fadeInDuration || 0}
                                  onChange={(e) => updateTrackField(track.id, 'fadeInDuration', Number(e.target.value))}
                                  className="w-full h-1 accent-emerald-500 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className={`font-mono text-xs font-bold min-w-[2.5rem] text-left ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                  {(track.fadeInDuration || 0).toFixed(1)} ש'
                                </span>
                              </div>
                            </div>

                            {/* Fade Out Duration */}
                            <div className="flex flex-col gap-1.5">
                              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                <span>יציאה רכה (Fade Out):</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={track.fadeOutDuration || 0}
                                  onChange={(e) => updateTrackField(track.id, 'fadeOutDuration', Number(e.target.value))}
                                  className="w-full h-1 accent-red-400 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className={`font-mono text-xs font-bold min-w-[2.5rem] text-left ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                  {(track.fadeOutDuration || 0).toFixed(1)} ש'
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

             {/* Split row: Freesound and Add Silence buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-2 border-t border-dashed border-zinc-700/20">
              <button
                id="add-music-migrating-btn"
                onClick={() => setIsFreesoundModalOpen(true)}
                className={`py-3.5 px-4 rounded-xl border-2 border-dashed font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isDarkMode
                    ? 'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 hover:border-indigo-400'
                    : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:border-indigo-500'
                }`}
              >
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>הוסף פתיח, מעבר או אפקט מוזיקלי (Freesound)</span>
              </button>

              <button
                id="add-silence-btn"
                onClick={handleAddSilenceTrack}
                className={`py-3.5 px-4 rounded-xl border-2 border-dashed font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isDarkMode
                    ? 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/15 text-blue-300 hover:border-blue-400'
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:border-blue-500'
                }`}
              >
                <Clock className="w-4 h-4 text-blue-500" />
                <span>הוסף מרווח שקט (3 שניות)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Merging & Final Export Controls */}
      <div className={`rounded-2xl p-6 shadow-xl flex flex-col gap-5 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#2d2d37]/45 border border-zinc-700/20' : 'bg-white'
      }`}>
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Download className="w-5 h-5 text-zinc-500" />
          מיזוג סופי וייצוא ההסכת
        </h3>

        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
          סדרו את קטעי הקול שלכם ברצף כרונולוגי לפי הסדר הרצוי למעלה, והמערכת תחבר, תעבד ותייצר קובץ שמע אחד סופי הניתן להורדה ישירות למחשב.
        </p>

        {/* Collapsible Advanced Options Panel */}
        <div className={`rounded-xl border flex flex-col overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#18181f] border-zinc-700/20' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <button
            type="button"
            onClick={() => setIsAdvancedOptionsExpanded(!isAdvancedOptionsExpanded)}
            className={`w-full p-4 flex items-center justify-between transition-colors text-right cursor-pointer select-none ${
              isDarkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-100/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <div className="text-right">
                <h4 className="text-sm font-bold">אפשרויות שמע ומעברים מתקדמים</h4>
                {!isAdvancedOptionsExpanded && (
                  <div className={`text-[10px] mt-0.5 font-bold ${isDarkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    פורמט: {exportFormat.toUpperCase()} | {useCrossfade ? 'מצב מעבר רך פעיל' : 'ללא מעבר רך'} | {useNormalization ? 'הגנה מצרימה פעילה' : 'ללא הגנה מצרימה'} | {useDucking ? 'הנמכת מוזיקה פעילה' : 'ללא הנמכה'}
                  </div>
                )}
              </div>
            </div>
            <div className={`${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isAdvancedOptionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {isAdvancedOptionsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-zinc-700/10 flex flex-col gap-4 mt-3">
                  {/* Format selector */}
                  <div className="flex flex-col gap-2">
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>בחרו פורמט לקובץ הסופי:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setExportFormat('wav')}
                        className={`p-3 rounded-xl border transition-all text-right flex items-center gap-3 cursor-pointer ${
                          exportFormat === 'wav'
                            ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-800')
                            : (isDarkMode ? 'border-zinc-800 bg-[#2d2d37]/40 text-zinc-400 hover:bg-[#2d2d37]' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm')
                        }`}
                      >
                        <FileAudio className="w-5 h-5 text-indigo-500" />
                        <div>
                          <div className="text-xs font-bold font-sans">קובץ גדול / מאסטר לא דחוס (WAV)</div>
                          <div className="text-[10px] mt-0.5 text-zinc-500">איכות אולפן מקורית | קובץ גדול יותר</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExportFormat('webm')}
                        className={`p-3 rounded-xl border transition-all text-right flex items-center gap-3 cursor-pointer ${
                          exportFormat === 'webm'
                            ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-800')
                            : (isDarkMode ? 'border-zinc-800 bg-[#2d2d37]/40 text-zinc-400 hover:bg-[#2d2d37]' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm')
                        }`}
                      >
                        <Music className="w-5 h-5 text-indigo-500" />
                        <div>
                          <div className="text-xs font-bold font-sans">קובץ קל לשיתוף (WebM / Opus)</div>
                          <div className="text-[10px] mt-0.5 text-zinc-500">דחוס וחסכוני ביותר | מהיר להעלאה ושיתוף</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Options checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-700/10">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useCrossfade}
                        onChange={(e) => setUseCrossfade(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-indigo-500 cursor-pointer"
                      />
                      <div className="text-right">
                        <div className="text-xs font-bold font-sans">מעבר רך (Crossfade)</div>
                        <div className="text-[10px] mt-0.5 leading-normal text-zinc-500 font-sans">חפיפה חלקה של 1.5 ש' בין קטעים</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useNormalization}
                        onChange={(e) => setUseNormalization(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-indigo-500 cursor-pointer"
                      />
                      <div className="text-right">
                        <div className="text-xs font-bold font-sans">הגנה מצרימה (Clip protection)</div>
                        <div className="text-[10px] mt-0.5 leading-normal text-zinc-500 font-sans">מנמיך רק אם המיקס חזק מדי ומונע עיוותים</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useDucking}
                        onChange={(e) => setUseDucking(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-indigo-500 cursor-pointer"
                      />
                      <div className="text-right">
                        <div className="text-xs font-bold font-sans">הנמכת מוזיקה (Auto-Ducking)</div>
                        <div className="text-[10px] mt-0.5 leading-normal text-zinc-500 font-sans">החלשת מוזיקה אוטומטית בזמן דיבור</div>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Long Project warning */}
        {(() => {
          const totalDurationSec = tracks.reduce((sum, t) => sum + (t.trimEnd - t.trimStart + (t.silenceAfter || 0)), 0);
          if (totalDurationSec > 600) {
            return (
              <div className={`p-4 rounded-xl text-xs flex gap-3 items-start border ${
                isDarkMode 
                  ? 'bg-amber-950/20 border-amber-500/20 text-amber-300' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                <div className="leading-normal text-right">
                  <div className="font-bold mb-1 font-sans">⚠️ פרויקט ארוך במיוחד זוהה ({formatTime(totalDurationSec)})</div>
                  <span className="font-sans">מאחר והעיבוד מתבצע כולו ישירות בדפדפן, פרויקטים מעל 10 דקות עלולים לגזול זיכרון רב בדפדפנים ניידים או ישנים. מומלץ לעבוד במחשב שולחני או לפצל את ההסכת לקטעים קצרים יותר.</span>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* WebM compressing progress bar */}
        {isCompressing && (
          <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
            isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
          }`}>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-sans">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>דוחס ומקודד את ההסכת בפורמט קומפקטי (WebM)...</span>
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{compressProgress}%</span>
            </div>
            <div className="w-full bg-zinc-700/20 dark:bg-zinc-700/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${compressProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={mergePodcastTracks}
          disabled={isMerging || isCompressing || tracks.length === 0 || !hasUnmergedChanges}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow text-base flex items-center justify-center gap-2 cursor-pointer ${
            tracks.length === 0 || !hasUnmergedChanges
              ? (isDarkMode ? 'bg-[#1c1c22] text-zinc-600' : 'bg-zinc-200 text-zinc-400')
              : isMerging || isCompressing
              ? (isDarkMode ? 'bg-[#2d2d37] text-zinc-400' : 'bg-zinc-300 text-zinc-600')
              : (isDarkMode ? 'bg-zinc-200 hover:bg-white text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-900 text-white')
          }`}
        >
          {isMerging ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="font-sans">מעבד, חותך ומחבר את קטעי השמע...</span>
            </>
          ) : isCompressing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="font-sans">מקודד ומכווץ שמע ({compressProgress}%)...</span>
            </>
          ) : !hasUnmergedChanges ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="font-sans">ההסכת מעודכן ומוזג בהצלחה</span>
            </>
          ) : (
            <>
              <Sliders className="w-4 h-4" />
              <span className="font-sans">חבר קטעי קול להסכת</span>
            </>
          )}
        </button>

        {/* Final Export Merged Player */}
        {mergedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 rounded-xl ${
              isDarkMode ? 'bg-[#18181f] border border-zinc-700/20' : 'bg-zinc-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 inline-block font-sans ${
                  isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                }`}>
                  קובץ מוכן לייצוא!
                </span>
                <h4 className="text-base font-bold font-sans">הסכת מאוחד ומעובד סופית</h4>
                <p className={`text-xs font-bold mt-1.5 font-sans ${isDarkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  משך כולל: {formatTime(mergedDuration)} שניות | {tracks.length} קטעים מחוברים | קובץ {exportFormat === 'webm' ? 'WebM/Opus קל ודחוס' : 'WAV באיכות גבוהה'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={toggleMergedAudio}
                  className={`px-4 py-2.5 text-sm rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isMergedPlayerPlaying
                      ? (isDarkMode ? 'bg-[#373743] text-white' : 'bg-zinc-200 text-zinc-900 shadow-sm')
                      : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-sm')
                  }`}
                >
                  {isMergedPlayerPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span className="font-sans">עצור השמעה</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span className="font-sans">האזן להסכת המוכן</span>
                    </>
                  )}
                </button>

                <a
                  href={mergedUrl}
                  download={`podcast_studio_export_${Date.now()}.${exportFormat === 'webm' ? 'webm' : 'wav'}`}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                    isDarkMode ? 'bg-zinc-200 hover:bg-white text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-sm'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-sans font-sans">הורד הסכת מוכן</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};
