import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Volume2,
  FileAudio,
  RotateCcw,
  RefreshCw,
  Plus,
  BookOpen,
  Sparkles,
  Clock,
  AlertCircle,
  Info,
  Sliders,
  Scissors,
  FileText,
  VolumeX,
  Check,
  Languages,
  GripVertical,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Book,
  ExternalLink,
  Music,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings,
  Menu
} from 'lucide-react';
import { PodcastTrack, ScriptSuggestion, ScriptCard } from './types';
import { TrackTimeline } from './components/TrackTimeline';
import { getRandomQuery } from './utils/freesoundQueries';
import { WorkflowRail } from './components/WorkflowRail';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { TrackList } from './components/TrackList';
import {
  getAllTracksFromDB,
  saveTrackToDB,
  deleteTrackFromDB,
  clearTracksFromDB,
  saveSettingsToLocalStorage,
  loadSettingsFromLocalStorage,
  getConsentStatus,
  setConsentStatus,
  escapeHtml,
  projectBackupSchema,
  saveTrackMetadataToDB,
  saveTrackAudioToDB,
  createRecordingSession,
  saveRecordingChunk,
  getRecordingSession,
  updateRecordingSession,
  getChunksForSession,
  getPendingRecordingSessions,
  markSessionFinalized,
  deleteRecordingSessionAndChunks
} from './utils/storage';

import { SCRIPT_TEMPLATES } from './data/templates';
import { getWordCount, getReadTimeSeconds, formatReadTime, formatInstructionsJSX } from './utils/textHelpers';
import { renderPodcastMix } from './utils/audioRender';
import { ReadingCard } from './components/ReadingCard';
import { MobileSliderPopover } from './components/MobileSliderPopover';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Main Panel Tab: 'tracks' for editing tracks, 'text' for editing the script, 'recording' for reading and recording
  const [mainTab, setMainTab] = useState<'text' | 'recording' | 'tracks'>('text');

  // Toggle for showing example podcast scripts
  const [showExamples, setShowExamples] = useState<boolean>(false);

  // AI Prompt Assistant states (SMBK Pod AI Assistant)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [aiStudentNotes, setAiStudentNotes] = useState<string>("");
  const [aiStructure, setAiStructure] = useState<string>("שיחה בין שני אנשים");
  const [aiOutputFormat, setAiOutputFormat] = useState<string>("תסריט מלא");
  const [aiDuration, setAiDuration] = useState<string>("3 דקות");
  const [aiArchetype, setAiArchetype] = useState<string>("בית מדרש");
  const [aiPromptCopied, setAiPromptCopied] = useState<boolean>(false);
  const [aiPastedOutput, setAiPastedOutput] = useState<string>("");
  const [aiTargetType, setAiTargetType] = useState<'cards' | 'text'>('cards');

  // Script / Notes panel state
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [scriptContent, setScriptContent] = useState<string>("");
  const [scriptMode, setScriptMode] = useState<'text' | 'cards'>('cards');
  const [scriptCards, setScriptCards] = useState<ScriptCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [podcastName, setPodcastName] = useState<string>("");
  const [participants, setParticipants] = useState<string>("");
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  const handleAddCard = (type: 'intro' | 'body' | 'outro') => {
    const newCard: ScriptCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      text: type === 'intro' ? 'שלום לכולם וברוכים הבאים להסכת שלנו!' : type === 'body' ? 'בפרק של היום נעסוק ב...' : 'תודה שהאזנתם לנו, להתראות!'
    };
    setScriptCards((prev) => [...prev, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setScriptCards((prev) => prev.filter(c => c.id !== id));
  };

  const handleUpdateCardText = (id: string, text: string) => {
    setScriptCards((prev) => prev.map(c => c.id === id ? { ...c, text } : c));
  };

  const handleMoveCardUp = (index: number) => {
    if (index === 0) return;
    setScriptCards((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveCardDown = (index: number) => {
    setScriptCards((prev) => {
      if (index === prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleCardDrop = (targetIndex: number) => {
    if (draggedCardIndex === null || draggedCardIndex === targetIndex) return;
    setScriptCards((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedCardIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };



  const [teleprompterMode, setTeleprompterMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 1-10 scale
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Premium Teleprompter states
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [isTeleprompterSettingsExpanded, setIsTeleprompterSettingsExpanded] = useState<boolean>(false);
  const [guideLineTop, setGuideLineTop] = useState<number>(0);
  const [guideLineHeight, setGuideLineHeight] = useState<number>(0);

  // Drag-and-drop state for track cards
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Audio Tracks State
  const [tracks, setTracks] = useState<PodcastTrack[]>([]);
  const [openVolumeTrackId, setOpenVolumeTrackId] = useState<string | null>(null);
  const [confirmDeleteTrackId, setConfirmDeleteTrackId] = useState<string | null>(null);
  const [showMobileTransitions, setShowMobileTransitions] = useState<Record<string, boolean>>({});
  const [openMobileSlider, setOpenMobileSlider] = useState<{ trackId: string, type: 'fadeIn' | 'fadeOut' | 'silence' } | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingQualityMode, setRecordingQualityMode] = useState<'natural' | 'classroom'>('natural');
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  // Crash Recovery and Storage Estimations
  const [pendingNameTrackId, setPendingNameTrackId] = useState<string | null>(null);
  const [pendingTrackName, setPendingTrackName] = useState<string>("");
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: number; quotaMb: number; pct: number } | null>(null);
  const recordingSessionIdRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingChunkIndexRef = useRef<number>(0);
  const recordingIntervalRef = useRef<any>(null);

  const recoverSession = async (session: any) => {
    setIsRecovering(true);
    try {
      const actualMime = session.mimeType || 'audio/webm';
      
      // Merge chunks into a single Blob by querying IndexedDB
      const chunks = await getChunksForSession(session.id);
      if (!chunks || chunks.length === 0) {
        throw new Error("No recording chunks found for this session.");
      }
      
      const combinedBlob = new Blob(chunks.map(c => c.blob), { type: actualMime });
      
      const estimatedDuration = (session.lastChunkAt - session.startedAt) / 1000;
      let duration = estimatedDuration > 0 ? estimatedDuration : 30;
      let peaks: number[] = [];
      let audioBuffer: AudioBuffer | undefined = undefined;

      // Only decode if duration is within 5 minutes to protect browser memory and prevent freezes
      if (duration <= 300) {
        try {
          const decodedBuffer = await decodeFileToBuffer(combinedBlob);
          duration = decodedBuffer.duration;
          audioBuffer = decodedBuffer;
          peaks = await generateWaveformPeaks(combinedBlob);
        } catch (err) {
          console.warn("Failed to decode combined blob, falling back to estimation:", err);
          peaks = Array.from({ length: 100 }, () => 0.5);
        }
      } else {
        peaks = Array.from({ length: 100 }, () => 0.3 + Math.random() * 0.4);
      }

      const recoveredTrack: PodcastTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: `${session.name} (שוחזר לאחר קריסה)`,
        blob: combinedBlob,
        audioUrl: URL.createObjectURL(combinedBlob),
        audioBuffer,
        duration: duration,
        trimStart: 0,
        trimEnd: duration,
        volume: 1.0,
        mimeType: actualMime,
        sizeBytes: combinedBlob.size,
        recordedAt: new Date(session.lastChunkAt || session.startedAt).toISOString(),
        peaks,
        sourceSessionId: session.id
      };

      setTracks((prev) => [...prev, recoveredTrack]);
      await deleteRecordingSessionAndChunks(session.id);
      setPendingSessions((prev) => prev.filter((s) => s.id !== session.id));
      setSuccessMsg('🏆 ההקלטה הבלתי-גמורה שוחזרה בהצלחה לפרויקט שלכם!');
    } catch (err: any) {
      console.error("Failed to recover session:", err);
      setErrorMsg('נכשל שחזור קובץ השמע המקוטע. ייתכן שהנתונים פגומים.');
    } finally {
      setIsRecovering(false);
    }
  };

  const discardSession = async (sessionId: string) => {
    try {
      await deleteRecordingSessionAndChunks(sessionId);
      setPendingSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccessMsg('ההקלטה הבלתי-גמורה נמחקה בהצלחה.');
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  // Freesound integration states
  const [isFreesoundModalOpen, setIsFreesoundModalOpen] = useState<boolean>(false);
  const [freesoundCategory, setFreesoundCategory] = useState<'intro' | 'transition' | 'outro'>('intro');
  const [freesoundResults, setFreesoundResults] = useState<any[]>([]);
  const [freesoundLoading, setFreesoundLoading] = useState<boolean>(false);
  const [freesoundSearchQuery, setFreesoundSearchQuery] = useState<string>("");
  const [freesoundSort, setFreesoundSort] = useState<string>("score");
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    previewAudioRef.current = previewAudio;
  }, [previewAudio]);

  const fetchFreesoundAssets = async (category: 'intro' | 'transition' | 'outro', customQuery?: string, sortVal?: string) => {
    setFreesoundLoading(true);
    setErrorMsg(null);
    try {
      let query = customQuery;
      if (!query) {
        query = getRandomQuery(category);
        setFreesoundSearchQuery(query);
      }

      const activeSort = sortVal || freesoundSort || "score";
      const type = category === 'transition' ? 'soundeffects' : 'music';

      const response = await fetch(`/api/freesound?type=${type}&q=${encodeURIComponent(query)}&category=${category}&sort=${activeSort}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch from proxy, status: ${response.status}`);
      }
      const data = await response.json();
      const rawResults = data.results || [];
      const filteredResults = rawResults.filter((hit: any) => {
        const duration = hit.duration;
        if (duration === undefined || duration === null || typeof duration !== 'number' || isNaN(duration)) {
          return true;
        }
        if (category === 'intro' || category === 'outro') {
          return duration <= 10;
        }
        if (category === 'transition') {
          return duration <= 15;
        }
        return true;
      });
      setFreesoundResults(filteredResults);
    } catch (error: any) {
      console.error('Error loading Freesound assets:', error);
      setErrorMsg('שגיאה בטעינת קטעי שמע מ-Freesound. אנא נסה שוב.');
    } finally {
      setFreesoundLoading(false);
    }
  };

  useEffect(() => {
    if (isFreesoundModalOpen) {
      const initialQuery = freesoundSearchQuery || getRandomQuery(freesoundCategory);
      if (!freesoundSearchQuery) {
        setFreesoundSearchQuery(initialQuery);
      }
      fetchFreesoundAssets(freesoundCategory, initialQuery, freesoundSort);
    }
  }, [isFreesoundModalOpen, freesoundCategory]);

  useEffect(() => {
    if (!isFreesoundModalOpen) {
      if (previewAudio) {
        cleanupAudioElement(previewAudio);
        setPreviewAudio(null);
      }
      setPreviewPlayingId(null);
      setFreesoundSearchQuery("");
      setFreesoundSort("score");
    }
  }, [isFreesoundModalOpen, previewAudio]);

  const handleFreesoundMoreVariety = () => {
    const nextQuery = getRandomQuery(freesoundCategory);
    setFreesoundSearchQuery(nextQuery);
    const SORTS = ["score", "rating_desc", "downloads_desc", "created_desc"];
    const randomSort = SORTS[Math.floor(Math.random() * SORTS.length)];
    setFreesoundSort(randomSort);
    fetchFreesoundAssets(freesoundCategory, nextQuery, randomSort);
  };

  const togglePreviewAudio = (hitId: string, audioUrl: string) => {
    if (previewPlayingId === hitId && previewAudio) {
      cleanupAudioElement(previewAudio);
      setPreviewPlayingId(null);
    } else {
      if (previewAudio) {
        cleanupAudioElement(previewAudio);
      }
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error("Error playing preview:", e));
      audio.onended = () => {
        setPreviewPlayingId(null);
      };
      setPreviewAudio(audio);
      setPreviewPlayingId(hitId);
    }
  };

  const handleAddSilenceTrack = () => {
    const newTrack: PodcastTrack = {
      id: `silence-${Date.now()}`,
      name: 'מרווח שקט',
      duration: 15, // Let's make total potential length 15s so they can drag/trim it
      trimStart: 0,
      trimEnd: 3, // Defaults to 3s
      volume: 0,
      isSilence: true,
      isEffect: true,
    };
    setTracks((prev) => [...prev, newTrack]);
    setSuccessMsg('הוסף מרווח שקט של 3 שניות!');
  };

  const handleAddFreesoundTrack = async (hit: any) => {
    if (previewAudio) {
      cleanupAudioElement(previewAudio);
      setPreviewAudio(null);
    }
    setPreviewPlayingId(null);

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const categoryHebrew = freesoundCategory === 'intro' ? 'פתיח' : freesoundCategory === 'transition' ? 'מעברון' : 'סגיר';
    const rawTags = (hit.tags && hit.tags.length > 0) ? hit.tags.join(', ') : '';
    const cleanTag = (hit.tags && hit.tags.length > 0) ? hit.tags[0] : 'Freesound';
    const trackName = `אפקט/מוזיקה (${categoryHebrew}) - ${cleanTag}`;

    try {
      const audioUrl = hit.previews['preview-hq-mp3'] || hit.previews['preview-lq-mp3'];
      const audioResponse = await fetch(`/api/freesound/download?url=${encodeURIComponent(audioUrl)}`);
      if (!audioResponse.ok) {
        let errorMsgStr = 'שגיאה בהורדת הקובץ משרת המדיה';
        try {
          const errData = await audioResponse.json();
          if (errData && errData.error) {
            errorMsgStr = errData.error;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMsgStr);
      }
      const audioBlob = await audioResponse.blob();

      const decodedBuffer = await decodeFileToBuffer(audioBlob);
      const duration = decodedBuffer.duration;
      const peaks = await generateWaveformPeaks(audioBlob);

      let trimEndVal = duration;
      if (freesoundCategory === 'intro' || freesoundCategory === 'outro') {
        trimEndVal = Math.min(duration, 10);
      }

      const newTrack: PodcastTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: trackName,
        blob: audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        duration: duration,
        trimStart: 0,
        trimEnd: trimEndVal,
        volume: 0.8,
        isEffect: true,
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
        recordedAt: new Date().toISOString(),
        peaks: peaks
      };

      setTracks((prev) => [...prev, newTrack]);
      setSuccessMsg(`התווסף בהצלחה: ${trackName}`);
      setIsFreesoundModalOpen(false);
    } catch (err: any) {
      console.error('Error adding Freesound track:', err);
      setErrorMsg(err.message || 'לא ניתן היה להוריד את קובץ השמע, אנא נסו קטע אחר');
    } finally {
      setIsUploading(false);
    }
  };

  // Native recording instances
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // Web Audio Context & Analyser
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micCanvasRef = useRef<HTMLCanvasElement>(null);

  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);

  const releaseLiveRecordingResources = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      micSourceRef.current?.disconnect();
    } catch {}

    try {
      micAnalyserRef.current?.disconnect();
    } catch {}

    micSourceRef.current = null;
    micAnalyserRef.current = null;

    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }

    if (micAudioCtxRef.current && micAudioCtxRef.current.state !== 'closed') {
      try {
        await micAudioCtxRef.current.close();
      } catch {}
    }

    micAudioCtxRef.current = null;
  };

  // Audio Playback State for Individual Tracks
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playingFullTrackId, setPlayingFullTrackId] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Merge & Export State
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [hasUnmergedChanges, setHasUnmergedChanges] = useState<boolean>(true);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedDuration, setMergedDuration] = useState<number>(0);
  const [isMergedPlayerPlaying, setIsMergedPlayerPlaying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const mergedAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupAudioElement = (audio?: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (e) {
      console.warn("Error cleaning up audio element:", e);
    }
  };

  const [useCrossfade, setUseCrossfade] = useState<boolean>(true);
  const [useNormalization, setUseNormalization] = useState<boolean>(true);
  const [useDucking, setUseDucking] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<'wav' | 'webm'>('wav');
  const [compressProgress, setCompressProgress] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [expandedTracks, setExpandedTracks] = useState<{ [key: string]: boolean }>({});
  const [isAdvancedOptionsExpanded, setIsAdvancedOptionsExpanded] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const latestTracksRef = useRef<PodcastTrack[]>([]);
  const latestMergedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    latestTracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    latestMergedUrlRef.current = mergedUrl;
  }, [mergedUrl]);

  useEffect(() => {
    setHasUnmergedChanges(true);
  }, [tracks]);

  const isScrolled = true;
  const showHeader = true;

  const [headerScrolledDown, setHeaderScrolledDown] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderScrolledDown(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Synchronize AI Assistant Output Presentation Format with the editing style (scriptMode) above the panel
  useEffect(() => {
    if (scriptMode === 'text') {
      setAiOutputFormat("תסריט מלא");
      setAiTargetType("text");
    } else if (scriptMode === 'cards') {
      setAiOutputFormat("כרטיסיות שיחה דינמיות - Talking Points");
      setAiTargetType("cards");
    }
  }, [scriptMode]);

  // Load saved settings and tracks on initial load directly
  useEffect(() => {
    setConsentStatus(true);
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const settings = loadSettingsFromLocalStorage();
    if (settings) {
      if (settings.podcastName !== undefined) setPodcastName(settings.podcastName);
      if (settings.participants !== undefined) setParticipants(settings.participants);
      if (settings.scriptContent !== undefined) setScriptContent(settings.scriptContent);
      if (settings.scriptMode !== undefined) setScriptMode(settings.scriptMode);
      if (settings.scriptCards !== undefined) setScriptCards(settings.scriptCards);
      if (settings.activeCardIndex !== undefined) setActiveCardIndex(settings.activeCardIndex);
      if (settings.aiStudentNotes !== undefined) setAiStudentNotes(settings.aiStudentNotes);
      if (settings.aiStructure !== undefined) setAiStructure(settings.aiStructure);
      if (settings.aiOutputFormat !== undefined) setAiOutputFormat(settings.aiOutputFormat);
      if (settings.aiDuration !== undefined) setAiDuration(settings.aiDuration);
      if (settings.aiArchetype !== undefined) setAiArchetype(settings.aiArchetype);
    }

    try {
      // Check for crashed/pending recording sessions
      getPendingRecordingSessions().then((sessions) => {
        if (sessions && sessions.length > 0) {
          setPendingSessions(sessions);
        }
      }).catch(err => console.error("Error reading pending sessions:", err));

      // Fetch storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          const usedMb = est.usage ? Math.round(est.usage / (1024 * 1024)) : 0;
          const quotaMb = est.quota ? Math.round(est.quota / (1024 * 1024)) : 0;
          const pct = quotaMb > 0 ? Math.round((usedMb / quotaMb) * 100) : 0;
          setStorageEstimate({ usedMb, quotaMb, pct });
        }).catch(err => console.error("Storage estimate error:", err));
      }

      // Request persistent storage permission to protect classroom records from eviction
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((persisted) => {
          if (persisted) {
            console.log("Storage is persisted and will not be automatically evicted.");
          } else {
            console.log("Storage is best-effort and can be evicted under disk pressure.");
          }
        });
      }

      const storedTracks = await getAllTracksFromDB();
      if (storedTracks && storedTracks.length > 0) {
        const decodedTracks: PodcastTrack[] = [];
        for (const st of storedTracks) {
          decodedTracks.push({
            id: st.id,
            name: st.name,
            blob: st.blob,
            audioUrl: st.blob ? URL.createObjectURL(st.blob) : undefined,
            duration: st.duration,
            trimStart: st.trimStart,
            trimEnd: st.trimEnd,
            volume: st.volume,
            isEffect: st.isEffect,
            mimeType: st.mimeType,
            recordedAt: st.recordedAt,
            sizeBytes: st.sizeBytes,
            peaks: st.peaks || Array.from({ length: 100 }, () => 0.1),
            fadeInDuration: st.fadeInDuration || 0,
            fadeOutDuration: st.fadeOutDuration || 0,
            silenceAfter: st.silenceAfter || 0,
            isMissingAudio: st.isMissingAudio,
            sourceSessionId: st.sourceSessionId
          });
        }

        if (settings && settings.trackIdsOrder) {
          const orderMap = new Map(settings.trackIdsOrder.map((id, index) => [id, index]));
          decodedTracks.sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
            return indexA - indexB;
          });
        }

        if (decodedTracks.length > 0) {
          setTracks(decodedTracks);

          // Asynchronously generate peaks in background for loaded tracks missing them
          setTimeout(() => {
            decodedTracks.forEach(async (track) => {
              if (track.blob && (!track.peaks || track.peaks.length === 0)) {
                console.log(`Generating peaks asynchronously for track: ${track.name}`);
                const peaks = await generateWaveformPeaks(track.blob);
                setTracks((prev) =>
                  prev.map((t) => (t.id === track.id ? { ...t, peaks } : t))
                );
              }
            });
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error loading tracks on startup:', err);
    }
  };

  // Auto-save settings when changes occur
  useEffect(() => {
    if (!getConsentStatus()) return;
    saveSettingsToLocalStorage({
      podcastName,
      participants,
      scriptContent,
      scriptMode,
      scriptCards,
      activeCardIndex,
      aiStudentNotes,
      aiStructure,
      aiOutputFormat,
      aiDuration,
      aiArchetype,
      trackIdsOrder: tracks.map(t => t.id)
    });
  }, [
    podcastName,
    participants,
    scriptContent,
    scriptMode,
    scriptCards,
    activeCardIndex,
    aiStudentNotes,
    aiStructure,
    aiOutputFormat,
    aiDuration,
    aiArchetype,
    tracks
  ]);

  // Sync tracks state with IndexedDB (Debounced to prevent heavy writes during trimming)
  useEffect(() => {
    if (!getConsentStatus()) return;

    const timer = setTimeout(async () => {
      try {
        const storedTracks = await getAllTracksFromDB();
        const storedMap = new Map(storedTracks.map(t => [t.id, t]));
        const currentMap = new Map(tracks.map(t => [t.id, t]));

        // 1. Delete tracks no longer in state
        for (const stored of storedTracks) {
          if (!currentMap.has(stored.id)) {
            await deleteTrackFromDB(stored.id);
          }
        }

        // 2. Add or update tracks
        for (const track of tracks) {
          const stored = storedMap.get(track.id);
          const needsSave = !stored ||
            stored.name !== track.name ||
            stored.trimStart !== track.trimStart ||
            stored.trimEnd !== track.trimEnd ||
            stored.volume !== track.volume ||
            stored.duration !== track.duration ||
            stored.fadeInDuration !== track.fadeInDuration ||
            stored.fadeOutDuration !== track.fadeOutDuration ||
            stored.silenceAfter !== track.silenceAfter ||
            JSON.stringify(stored.peaks) !== JSON.stringify(track.peaks);

          if (needsSave) {
            if (!stored) {
              await saveTrackToDB({
                id: track.id,
                name: track.name,
                blob: track.blob,
                duration: track.duration,
                trimStart: track.trimStart,
                trimEnd: track.trimEnd,
                volume: track.volume,
                isEffect: track.isEffect,
                mimeType: track.mimeType,
                recordedAt: track.recordedAt,
                sizeBytes: track.sizeBytes,
                peaks: track.peaks,
                fadeInDuration: track.fadeInDuration || 0,
                fadeOutDuration: track.fadeOutDuration || 0,
                silenceAfter: track.silenceAfter || 0
              });
            } else {
              await saveTrackMetadataToDB({
                id: track.id,
                name: track.name,
                duration: track.duration,
                trimStart: track.trimStart,
                trimEnd: track.trimEnd,
                volume: track.volume,
                isEffect: track.isEffect,
                mimeType: track.mimeType,
                recordedAt: track.recordedAt,
                sizeBytes: track.sizeBytes,
                peaks: track.peaks,
                fadeInDuration: track.fadeInDuration || 0,
                fadeOutDuration: track.fadeOutDuration || 0,
                silenceAfter: track.silenceAfter || 0
              });
            }
          }
        }
      } catch (err) {
        console.error('Error syncing tracks to DB:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [tracks]);

  // Derived content for teleprompter based on mode
  const teleprompterText = useMemo(() => {
    if (scriptMode === 'text') {
      return scriptContent;
    } else {
      return scriptCards.map(card => {
        const prefix = card.type === 'intro' ? 'פתיח: ' : card.type === 'body' ? 'גוף הדיון: ' : 'סיכום: ';
        return `${prefix}${card.text}`;
      }).join('\n\n');
    }
  }, [scriptContent, scriptCards, scriptMode]);

  // Split script into words but preserve paragraph boundaries.
  const parsedWords = useMemo(() => {
    const lines = teleprompterText.split('\n');
    let globalIndex = 0;
    return lines.map((line) => {
      const lineWords = line.split(/\s+/).filter(Boolean);
      const mapped = lineWords.map((word) => {
        const isSpeakerInstruction = word.includes('(') || word.includes(')');
        const isGeneralInstruction = word.includes('[') || word.includes(']');
        const isInstruction = isSpeakerInstruction || isGeneralInstruction;
        const item = {
          word,
          index: globalIndex,
          isInstruction,
          isSpeakerInstruction,
          isGeneralInstruction,
        };
        globalIndex++;
        return item;
      });
      return {
        lineWords: mapped,
        isEmpty: line.trim() === '',
      };
    });
  }, [teleprompterText]);

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

  // 1. Initialize or get AudioContext lazily
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // 2. Handle script scrolling and word highlighting (Teleprompter)
  useEffect(() => {
    let intervalId: number | null = null;
    if (isScrolling && mainTab === 'recording' && scriptMode === 'text') {
      // Milliseconds per word based on selected speed (optimized: slow is faster, normal is slower)
      const msPerWord = speechRate === 'slow' ? 520 : speechRate === 'normal' ? 460 : 350;
      
      intervalId = window.setInterval(() => {
        setActiveWordIndex((prev) => {
          const totalWords = parsedWords.reduce((sum, line) => sum + line.lineWords.length, 0);
          if (prev >= totalWords - 1) {
            setIsScrolling(false);
            return prev;
          }
          return prev + 1;
        });
      }, msPerWord) as unknown as number;
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isScrolling, mainTab, scriptMode, speechRate, parsedWords]);

  // Automatically scroll the container to keep the active word in the upper third of the box
  useEffect(() => {
    if (isScrolling && mainTab === 'recording' && scriptMode === 'text') {
      const activeWordElem = document.getElementById(`app-word-${activeWordIndex}`);
      if (activeWordElem && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const rect = activeWordElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + container.scrollTop;
        
        container.scrollTo({
          top: Math.max(0, relativeTop - containerRect.height / 3),
          behavior: 'smooth'
        });
      }
    }
  }, [activeWordIndex, mainTab, scriptMode, isScrolling]);

  // Update guide line position to match the active word's line
  useEffect(() => {
    if (mainTab === 'recording' && scriptMode === 'text') {
      const updatePosition = () => {
        const activeWordElem = document.getElementById(`app-word-${activeWordIndex}`);
        if (activeWordElem && scrollContainerRef.current) {
          const offsetTop = activeWordElem.offsetTop;
          const offsetHeight = activeWordElem.offsetHeight;
          setGuideLineTop(offsetTop - 2);
          setGuideLineHeight(offsetHeight + 4);
        } else {
          setGuideLineHeight(0);
        }
      };

      updatePosition();
      const handle = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(handle);
    }
  }, [activeWordIndex, mainTab, scriptMode, fontSize, teleprompterText]);

  // Reset scrolling state on tab or mode change to keep things clean
  useEffect(() => {
    setIsScrolling(false);
  }, [mainTab, scriptMode]);

  // Handle Recording Timer and microphone level visualization
  useEffect(() => {
    if (isRecording) {
      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const nextSec = prev + 1;
          const MAX_SINGLE_RECORDING_MINUTES = 60;
          const WARNING_AT_MINUTES = 20;
          if (nextSec >= MAX_SINGLE_RECORDING_MINUTES * 60) {
            stopRecording();
            setErrorMsg('🔴 ההקלטה הופסקה אוטומטית עקב הגעה למגבלת הבטיחות של 60 דקות כדי להגן על זיכרון המכשיר.');
          } else if (nextSec === WARNING_AT_MINUTES * 60) {
            setSuccessMsg('⚠️ שים/י לב: ההקלטה נמשכת כבר 20 דקות. מומלץ לסיים ולשמור את הרצועה בקרוב.');
          }
          return nextSec;
        });
      }, 1000) as unknown as number;
    } else {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      setRecordingSeconds(0);
    }

    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Clean up canvas animations and audio elements on unmount
  useEffect(() => {
    return () => {
      releaseLiveRecordingResources();
      // Clean up playing audio elements
      Object.values(audioElementsRef.current).forEach((audio) => {
        cleanupAudioElement(audio);
      });
      audioElementsRef.current = {};
      if (mergedAudioRef.current) {
        cleanupAudioElement(mergedAudioRef.current);
        mergedAudioRef.current = null;
      }
      if (previewAudioRef.current) {
        cleanupAudioElement(previewAudioRef.current);
      }
      // Close the general shared AudioContext on unmount
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      // Clean up object URLs to avoid memory leaks
      latestTracksRef.current.forEach((t) => {
        if (t.audioUrl) URL.revokeObjectURL(t.audioUrl);
      });
      if (latestMergedUrlRef.current) URL.revokeObjectURL(latestMergedUrlRef.current);
    };
  }, []);

  // Keep aiTargetType in sync with scriptMode
  useEffect(() => {
    setAiTargetType(scriptMode);
  }, [scriptMode]);

  // Keep aiOutputFormat in sync with aiTargetType
  useEffect(() => {
    if (aiTargetType === 'text') {
      setAiOutputFormat("תסריט מלא");
    } else {
      setAiOutputFormat("כרטיסיות שיחה דינמיות - Talking Points");
    }
  }, [aiTargetType]);

  // Format seconds to MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(remainingSecs)}`;
  };

  const getTrackColorClass = (trackName: string, isEffect: boolean) => {
    if (isEffect) {
      return isDarkMode ? 'bg-purple-500' : 'bg-purple-400';
    }
    const name = trackName.toLowerCase();
    if (name.includes('פתיח') || name.includes('intro')) {
      return 'bg-indigo-500';
    }
    if (name.includes('גוף') || name.includes('body')) {
      return 'bg-emerald-500';
    }
    if (name.includes('סיכום') || name.includes('outro') || name.includes('summary')) {
      return 'bg-amber-500';
    }
    return isDarkMode ? 'bg-[#ffcc00]' : 'bg-zinc-400';
  };

  // Live microphone level drawing
  const drawMicLevel = () => {
    const canvas = micCanvasRef.current;
    const analyser = micAnalyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create a gradient style for the level indicator
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#10b981'); // Emerald 500
      gradient.addColorStop(0.5, '#3b82f6'); // Blue 500
      gradient.addColorStop(1, '#6366f1'); // Indigo 500

      ctx.fillStyle = '#f1f5f9'; // background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw active waveform bars
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 1.2;

        ctx.fillStyle = gradient;
        // Center-align the bars vertically
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  // 3. Start Recording
  const startRecording = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    audioChunksRef.current = [];
    recordingChunkIndexRef.current = 0;

    const RECORDING_MIME_CANDIDATES = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/webm',
    ];

    try {
      // 1. Request high-quality studio voice constraints with user-selected quality mode
      let stream: MediaStream;
      const isNatural = recordingQualityMode === 'natural';
      const audioConstraints = {
        echoCancellation: !isNatural,
        noiseSuppression: !isNatural,
        autoGainControl: !isNatural,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 }
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
      } catch (err) {
        console.warn("High-quality audio constraints failed, falling back to basic stream:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
        } catch (fallbackErr) {
          throw new Error("לא ניתן לגשת למיקרופון. אנא ודא/י שהענקת הרשאות מתאימות.");
        }
      }
      recordingStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const micAudioCtx = new AudioCtxClass();
      micAudioCtxRef.current = micAudioCtx;

      const source = micAudioCtx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      const analyser = micAudioCtx.createAnalyser();
      analyser.fftSize = 64; // smaller size for snappy level bar
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      // Choose supported mimeType
      let mimeType = 'audio/webm';
      for (const candidate of RECORDING_MIME_CANDIDATES) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const recordingSessionId = `rec-session-${Date.now()}`;
      recordingSessionIdRef.current = recordingSessionId;
      recordingStartTimeRef.current = Date.now();

      const existingTakes = tracks.filter(t => !t.isEffect && !t.isSilence);
      let maxNum = 0;
      for (const t of existingTakes) {
        const matchTake = t.name.match(/טייק\s+(\d+)/);
        if (matchTake) {
          const num = parseInt(matchTake[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        } else {
          const matchPrefix = t.name.match(/^(\d+)/);
          if (matchPrefix) {
            const num = parseInt(matchPrefix[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
      const nextNumber = maxNum + 1;
      const trackName = `טייק ${String(nextNumber).padStart(2, '0')}`;

      // Initialize recording session in IndexedDB
      const sessionRecord = {
        id: recordingSessionId,
        projectId: 'default-project',
        name: trackName,
        mimeType,
        startedAt: Date.now(),
        lastChunkAt: Date.now(),
        chunkCount: 0,
        active: true
      };
      await createRecordingSession(sessionRecord);

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          const chunkIndex = recordingChunkIndexRef.current++;
          const chunkId = `${recordingSessionId}-${chunkIndex}`;

          const chunkRecord = {
            id: chunkId,
            sessionId: recordingSessionId,
            index: chunkIndex,
            blob: event.data,
            sizeBytes: event.data.size,
            createdAt: Date.now()
          };

          saveRecordingChunk(chunkRecord).then(() => {
            return updateRecordingSession(recordingSessionId, {
              chunkCount: chunkIndex + 1,
              lastChunkAt: Date.now()
            });
          }).catch((err) => {
            console.error("Failed to auto-save recording chunk:", err);
          });
        }
      };

      mediaRecorder.onstop = async () => {
        await releaseLiveRecordingResources();

        // Clear interval safely
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        const actualMime = mediaRecorder.mimeType || 'audio/webm';
        const sessionId = recordingSessionId; // capture local copy for callback safety

        try {
          // Fetch chunks from DB to build continuous blob (or fall back to memory array if DB empty)
          let chunks = await getChunksForSession(sessionId);
          let finalBlob: Blob;
          
          if (chunks && chunks.length > 0) {
            finalBlob = new Blob(chunks.map(c => c.blob), { type: actualMime });
          } else {
            finalBlob = new Blob(audioChunksRef.current, { type: actualMime });
          }
          
          const estimatedDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
          let duration = estimatedDuration > 0 ? estimatedDuration : 30;
          let peaks: number[] = [];
          let audioBuffer: AudioBuffer | undefined = undefined;

          // Only decode short recording in Web Audio to prevent freezing tabs on large records
          if (estimatedDuration <= 300) {
            try {
              const decodedBuffer = await decodeFileToBuffer(finalBlob);
              duration = decodedBuffer.duration;
              audioBuffer = decodedBuffer;
              peaks = await generateWaveformPeaks(finalBlob);
            } catch (err) {
              console.warn("Failed to decode recording, falling back to estimation:", err);
              peaks = Array.from({ length: 100 }, () => 0.5);
            }
          } else {
            // Placeholder peaks for long tracks
            peaks = Array.from({ length: 100 }, () => 0.3 + Math.random() * 0.4);
          }

          const newTrack: PodcastTrack = {
            id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: trackName,
            blob: finalBlob,
            audioUrl: URL.createObjectURL(finalBlob),
            audioBuffer,
            duration: duration,
            trimStart: 0,
            trimEnd: duration,
            volume: 1.0,
            mimeType: actualMime,
            sizeBytes: finalBlob.size,
            recordedAt: new Date().toISOString(),
            peaks: peaks,
            sourceSessionId: sessionId
          };

          setTracks((prev) => [...prev, newTrack]);
          setSuccessMsg('ההקלטה נשמרה בהצלחה והתווספה לרשימת הרצועות!');
          setPendingNameTrackId(newTrack.id);
          setPendingTrackName(newTrack.name);

          // Finalize and cleanup the session chunks
          await markSessionFinalized(sessionId, newTrack.id);
          await deleteRecordingSessionAndChunks(sessionId);
        } catch (err: any) {
          console.error(err);
          setErrorMsg('שגיאה בפענוח או שמירת נתוני השמע שהוקלטו.');
        }

        recordingSessionIdRef.current = null;
      };

      // Start recording continuously
      mediaRecorder.start();
      setIsRecording(true);

      // Periodically request data slices to prevent memory/gaps issues
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      }, 4000);

      // Trigger canvas drawing animation next tick
      setTimeout(() => {
        drawMicLevel();
      }, 50);

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('גישת המיקרופון נחסמה. אנא אפשר/י גישה למיקרופון בהגדרות הדפדפן כדי להקליט.');
      } else {
        setErrorMsg('לא ניתן לגשת למיקרופון. ודא/י שהוא מחובר כראוי.');
      }
    }
  };

  // 4. Stop Recording
  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Helper: Decode File/Blob to AudioBuffer using lazy AudioContext
  async function decodeFileToBuffer(fileOrBlob: File | Blob): Promise<AudioBuffer> {
    const audioCtx = getAudioContext();
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    return new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(
        arrayBuffer,
        (decoded) => resolve(decoded),
        (err) => {
          console.error('Error decoding audio data:', err);
          reject(err);
        }
      );
    });
  }

  // Helper: Decode and extract peak values for robust waveform visualization
  async function generateWaveformPeaks(blob: Blob, count = 60): Promise<number[]> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = getAudioContext();
      return new Promise<number[]>((resolve) => {
        audioCtx.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            const channelData = audioBuffer.getChannelData(0);
            const step = Math.floor(channelData.length / count) || 1;
            const peaks: number[] = [];
            for (let i = 0; i < count; i++) {
              let max = 0;
              const start = i * step;
              const end = Math.min(start + step, channelData.length);
              for (let j = start; j < end; j++) {
                const val = Math.abs(channelData[j]);
                if (val > max) max = val;
              }
              peaks.push(max);
            }
            const maxPeak = Math.max(...peaks) || 1;
            resolve(peaks.map(p => p / maxPeak));
          },
          (err) => {
            console.error('Error decoding for peaks:', err);
            // safe fallback sequence
            resolve(Array.from({ length: count }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.25)) * 0.6));
          }
        );
      });
    } catch (err) {
      console.error("Error in generateWaveformPeaks:", err);
      return Array.from({ length: count }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.25)) * 0.6);
    }
  }

  // 5. Handle File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const newUploadedTracks: PodcastTrack[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      try {
        const decodedBuffer = await decodeFileToBuffer(file);
        const duration = decodedBuffer.duration;
        const peaks = await generateWaveformPeaks(file);

        const newTrack: PodcastTrack = {
          id: `track-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, ""), // strip extension for cleaner display name
          blob: file,
          audioUrl: URL.createObjectURL(file),
          duration: duration,
          trimStart: 0,
          trimEnd: duration,
          volume: 1.0,
          mimeType: file.type,
          sizeBytes: file.size,
          recordedAt: new Date().toISOString(),
          peaks: peaks
        };

        newUploadedTracks.push(newTrack);
      } catch (err) {
        console.error(err);
        setErrorMsg(`לא ניתן היה לפענח את הקובץ: "${file.name}". אנא ודא/י שזהו קובץ שמע תקין מסוג MP3, WAV או M4A.`);
      }
    }

    if (newUploadedTracks.length > 0) {
      setTracks((prev) => [...prev, ...newUploadedTracks]);
      setSuccessMsg(`הועלו בהצלחה ${newUploadedTracks.length} קבצי קול!`);
    }

    setIsUploading(false);
    // Clear input
    event.target.value = '';
  };

  // 6. Delete Track
  const handleDeleteTrack = (id: string) => {
    setTracks((prev) => {
      const toDelete = prev.find((t) => t.id === id);
      if (toDelete && toDelete.audioUrl) {
        URL.revokeObjectURL(toDelete.audioUrl);
      }
      return prev.filter((t) => t.id !== id);
    });

    if (playingTrackId === id) {
      stopIndividualTrack();
    }
  };

  // 7. Reorder Tracks (Move Up / Down)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setTracks((prev) => {
      const newTracks = [...prev];
      const temp = newTracks[index];
      newTracks[index] = newTracks[index - 1];
      newTracks[index - 1] = temp;
      return newTracks;
    });
  };

  const handleMoveDown = (index: number) => {
    setTracks((prev) => {
      if (index === prev.length - 1) return prev;
      const newTracks = [...prev];
      const temp = newTracks[index];
      newTracks[index] = newTracks[index + 1];
      newTracks[index + 1] = temp;
      return newTracks;
    });
  };

  // 8. Update individual track fields (name, trimStart, trimEnd, volume)
  const updateTrackField = (id: string, field: keyof PodcastTrack, value: any) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id) {
          const updated = { ...track, [field]: value };
          // Validate range slider bounds
          if (field === 'trimStart') {
            updated.trimStart = Math.max(0, Math.min(Number(value), track.trimEnd - 0.1));
          }
          if (field === 'trimEnd') {
            updated.trimEnd = Math.max(track.trimStart + 0.1, Math.min(Number(value), track.duration));
          }
          return updated;
        }
        return track;
      })
    );
  };

  const updateTrackTrim = (id: string, start: number, end: number) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id) {
          return {
            ...track,
            trimStart: Math.max(0, Math.min(start, track.duration - 0.1)),
            trimEnd: Math.max(start + 0.1, Math.min(end, track.duration))
          };
        }
        return track;
      })
    );
  };

  // 9. Previewing specific trimmed audio segment
  const playIndividualTrackSegment = (track: PodcastTrack) => {
    if (track.isSilence) {
      if (playingTrackId === track.id) {
        stopIndividualTrack();
        return;
      }
      stopIndividualTrack();
      setPlayingTrackId(track.id);
      
      const durationSec = track.trimEnd - track.trimStart;
      const timeoutId = setTimeout(() => {
        stopIndividualTrack();
      }, durationSec * 1000);
      
      (window as any)[`silenceTimeout_${track.id}`] = timeoutId;
      return;
    }

    if (track.isMissingAudio || !track.audioUrl) {
      setErrorMsg('לא ניתן להשמיע רצועה זו כיוון שקובץ השמע המקורי שלה חסר או פגום.');
      return;
    }

    // If already playing this track, stop it
    if (playingTrackId === track.id) {
      stopIndividualTrack();
      return;
    }

    // Stop any other playing track
    stopIndividualTrack();

    // Create an HTML5 Audio object or seek to the start time
    const audio = new Audio(track.audioUrl);
    audio.currentTime = track.trimStart;
    audio.volume = track.volume;
    
    // Play the segment and schedule a pause when it reaches trimEnd
    audio.play()
      .then(() => {
        setPlayingTrackId(track.id);
        audioElementsRef.current[track.id] = audio;

        // Listen to timeupdate to check if we went past trimEnd
        const checkTime = () => {
          if (audio.currentTime >= track.trimEnd) {
            audio.pause();
            stopIndividualTrack();
          } else {
            // Keep checking
            if (playingTrackId === track.id || audioElementsRef.current[track.id] === audio) {
              requestAnimationFrame(checkTime);
            }
          }
        };
        requestAnimationFrame(checkTime);

        audio.onended = () => {
          stopIndividualTrack();
        };
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('שגיאה בניסיון להשמיע את הקטע.');
      });
  };

  const playIndividualFullTrack = (track: PodcastTrack) => {
    if (playingFullTrackId === track.id) {
      stopIndividualFullTrack();
      return;
    }

    stopIndividualFullTrack();
    stopIndividualTrack();

    if (track.isSilence) {
      setPlayingFullTrackId(track.id);
      const durationSec = track.duration || 5;
      const timeoutId = setTimeout(() => {
        stopIndividualFullTrack();
      }, durationSec * 1000);
      (window as any)[`silenceFullTimeout_${track.id}`] = timeoutId;
      return;
    }

    if (track.isMissingAudio || !track.audioUrl) {
      setErrorMsg('לא ניתן להשמיע רצועה זו כיוון שקובץ השמע המקורי שלה חסר או פגום.');
      return;
    }

    const audio = new Audio(track.audioUrl);
    audio.volume = track.volume;
    
    audio.play()
      .then(() => {
        setPlayingFullTrackId(track.id);
        audioElementsRef.current[track.id + '_full'] = audio;
        audio.onended = () => {
          stopIndividualFullTrack();
        };
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('שגיאה בניסיון להשמיע את הרצועה.');
      });
  };

  const stopIndividualFullTrack = () => {
    if (playingFullTrackId) {
      if (audioElementsRef.current[playingFullTrackId + '_full']) {
        cleanupAudioElement(audioElementsRef.current[playingFullTrackId + '_full']);
        delete audioElementsRef.current[playingFullTrackId + '_full'];
      }
      const silFullId = `silenceFullTimeout_${playingFullTrackId}`;
      if ((window as any)[silFullId]) {
        clearTimeout((window as any)[silFullId]);
        delete (window as any)[silFullId];
      }
    }
    setPlayingFullTrackId(null);
  };

  const stopIndividualTrack = () => {
    if (playingTrackId) {
      if (audioElementsRef.current[playingTrackId]) {
        cleanupAudioElement(audioElementsRef.current[playingTrackId]);
        delete audioElementsRef.current[playingTrackId];
      }
      const silId = `silenceTimeout_${playingTrackId}`;
      if ((window as any)[silId]) {
        clearTimeout((window as any)[silId]);
        delete (window as any)[silId];
      }
    }
    setPlayingTrackId(null);
    stopIndividualFullTrack();
  };

  // Helper for real-time capture to WebM/Opus (fully client-side & offline)
  const recordBufferToWebM = async (audioBuffer: AudioBuffer, onProgress: (progress: number) => void): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
          
        const mediaRecorder = new MediaRecorder(destination.stream, { 
          mimeType, 
          audioBitsPerSecond: 192000 
        });
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          audioCtx.close();
          resolve(blob);
        };
        
        mediaRecorder.start();
        source.start(0);
        
        const durationMs = audioBuffer.duration * 1000;
        const start = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - start;
          const pct = Math.min(100, (elapsed / durationMs) * 100);
          onProgress(pct);
          if (elapsed >= durationMs) {
            clearInterval(interval);
            try {
              source.stop();
            } catch (err) {}
            mediaRecorder.stop();
          }
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  };

  // 10. Web Audio API Merging and WAV/WebM Compilation
  const mergePodcastTracks = async () => {
    if (tracks.length === 0) {
      setErrorMsg('אנא הוסף/י לפחות רצועת שמע אחת לפני המיזוג.');
      return;
    }

    setIsMerging(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Stop any playing previews
    stopIndividualTrack();
    if (isMergedPlayerPlaying && mergedAudioRef.current) {
      cleanupAudioElement(mergedAudioRef.current);
      setIsMergedPlayerPlaying(false);
    }

    try {
      // Call our OfflineAudioContext render pipeline!
      const { buffer: mergedBuffer, duration: totalSeconds } = await renderPodcastMix(tracks, {
        useCrossfade,
        useDucking,
        useClipProtection: useNormalization,
        outputSampleRate: 48000
      });

      let finalBlob: Blob;
      let downloadableUrl = '';

      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
      }

      // Perform optional progressive native WebM capture if requested
      if (exportFormat === 'webm') {
        setIsCompressing(true);
        setCompressProgress(0);
        try {
          finalBlob = await recordBufferToWebM(mergedBuffer, (progress) => {
            setCompressProgress(Math.round(progress));
          });
          downloadableUrl = URL.createObjectURL(finalBlob);
        } catch (err) {
          console.error("Failed to compress to WebM/Opus:", err);
          setErrorMsg("כשל בדחיסת הקובץ ל-WebM, הקובץ יוצא בפורמט WAV המקורי.");
          finalBlob = bufferToWav(mergedBuffer);
          downloadableUrl = URL.createObjectURL(finalBlob);
        } finally {
          setIsCompressing(false);
        }
      } else {
        // WAV export
        finalBlob = bufferToWav(mergedBuffer);
        downloadableUrl = URL.createObjectURL(finalBlob);
      }

      setMergedBlob(finalBlob);
      setMergedUrl(downloadableUrl);
      setMergedDuration(totalSeconds);
      setHasUnmergedChanges(false);
      setSuccessMsg('🏆 ההסכת חובר ומוזג בהצלחה! השתמש/י בנגן למטה כדי להאזין או לחץ/י על כפתור ההורדה.');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'אירעה שגיאה בלתי צפויה במהלך חיבור ומיזוג הרצועות.');
    } finally {
      setIsMerging(false);
    }
  };

  // Native WAV encoder implementation
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 1 = Raw Uncompressed Linear PCM
    const bitDepth = 16;
    
    let result;
    if (numOfChan === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }
    
    const bufferLength = result.length * 2; // 16-bit is 2 bytes per sample
    const arrayBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(arrayBuffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + bufferLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChan, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* chunk length */
    view.setUint32(40, bufferLength, true);
    
    // Write the PCM audio samples
    floatTo16BitPCM(view, 44, result);
    
    return new Blob([view], { type: 'audio/wav' });
  };

  const interleave = (inputL: Float32Array, inputR: Float32Array): Float32Array => {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  };

  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Global merged audio preview toggle
  const toggleMergedAudio = () => {
    if (!mergedUrl) return;

    if (!mergedAudioRef.current || mergedAudioRef.current.src !== mergedUrl) {
      if (mergedAudioRef.current) {
        cleanupAudioElement(mergedAudioRef.current);
      }
      mergedAudioRef.current = new Audio(mergedUrl);
      mergedAudioRef.current.onended = () => {
        setIsMergedPlayerPlaying(false);
      };
    }

    if (isMergedPlayerPlaying) {
      if (mergedAudioRef.current) {
        cleanupAudioElement(mergedAudioRef.current);
        mergedAudioRef.current = null;
      }
      setIsMergedPlayerPlaying(false);
    } else {
      if (mergedAudioRef.current) {
        mergedAudioRef.current.play()
          .then(() => {
            setIsMergedPlayerPlaying(true);
          })
          .catch((err) => {
            console.error(err);
            setErrorMsg('שגיאה בניסיון להשמיע את ההסכת הממוזג.');
          });
      }
    }
  };

  // Helper to format speaker and general instructions for PDF output
  const formatInstructionsHTML = (text: string): string => {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // parentheticals (speaker instructions)
    escaped = escaped.replace(/(\([^)]+\))/g, '<span class="speaker-instruction">$1</span>');
    // brackets (general instructions / staging)
    escaped = escaped.replace(/(\[[^\]]+\])/g, '<span class="general-instruction">$1</span>');
    return escaped;
  };

  // Export script and cards to a beautiful, printable PDF
  const handleExportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setErrorMsg('אנא מאפשר/י פעולת פופ-אפ בדפדפן על מנת לייצא את הקובץ ל-PDF.');
      return;
    }

    const title = "תסריט וכרטיסיות ההסכת שלי";
    const dateStr = new Date().toLocaleDateString('he-IL');

    const validCards = scriptCards.filter(card => card.text && card.text.trim().length > 0);
    const hasCards = scriptMode === 'cards' && validCards.length > 0;
    const hasText = scriptMode === 'text' && scriptContent && scriptContent.trim().length > 0;

    let cardsHTML = '';
    if (hasCards) {
      cardsHTML = validCards.map((card, idx) => {
        const typeLabel = card.type === 'intro' ? 'פתיח 🎬' : card.type === 'outro' ? 'סיכום 🏁' : 'גוף / נקודה לדיון 🎙️';
        return `
          <div class="card-box">
            <span class="card-header-badge">${typeLabel} #${idx + 1}</span>
            <p class="card-body-text">${formatInstructionsHTML(card.text)}</p>
          </div>
        `;
      }).join('');
    }

    let formattedTextHTML = '';
    if (hasText) {
      formattedTextHTML = scriptContent
        .split('\n\n')
        .map(p => {
          const dialogueMatch = p.match(/^(\[[0-9:\s-]*\])?\s*([^:]+):/);
          if (dialogueMatch) {
            const time = dialogueMatch[1] ? `<span style="color: #4b5563; font-family: monospace; font-size: 13px; margin-left: 8px; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${escapeHtml(dialogueMatch[1])}</span>` : '';
            const speaker = `<strong style="color: #000000; font-size: 15px; border-bottom: 2px solid #000000; padding-bottom: 1px;">${escapeHtml(dialogueMatch[2])}:</strong>`;
            const rest = p.substring(dialogueMatch[0].length);
            return `<p style="margin-bottom: 14px; line-height: 1.6; font-size: 14px; color: #000000; margin-top: 0;">${time} ${speaker} ${formatInstructionsHTML(rest)}</p>`;
          }
          return `<p style="margin-bottom: 14px; line-height: 1.6; font-size: 14px; color: #000000; margin-top: 0;">${formatInstructionsHTML(p)}</p>`;
        })
        .join('');
    }

    let contentHTML = '';
    if (hasText) {
      contentHTML += `
        <div>
          <div class="section-title">✍️ תסריט מלא</div>
          <div style="background-color: #ffffff; border: 1.5px solid #000000; border-radius: 8px; padding: 20px; margin-bottom: 20px; color: #000000;">
            ${formattedTextHTML}
          </div>
        </div>
      `;
    }

    if (hasCards) {
      contentHTML += `
        <div>
          <div class="section-title">📋 כרטיסיות דיון ונקודות לניווט</div>
          <div style="margin-top: 10px;">
            ${cardsHTML}
          </div>
        </div>
      `;
    }

    if (!hasText && !hasCards) {
      contentHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #4b5563; font-style: italic; border: 1.5px solid #000000; border-radius: 8px;">
          אין כרטיסיות דיון עם טקסט או תסריט כתוב לייצוא.
        </div>
      `;
    }

    const infoHeaderHTML = (podcastName || participants) ? `
      <div style="background-color: #ffffff; border: 1.5px solid #000000; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; direction: rtl; text-align: right;">
        ${podcastName ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">שם ההסכת:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${escapeHtml(podcastName)}</span></div>` : '<div></div>'}
        ${participants ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">משתתפים:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${escapeHtml(participants)}</span></div>` : '<div></div>'}
      </div>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&display=swap');
          
          /* Reset margins for printing to prevent extra blank pages */
          @page {
            size: auto;
            margin: 15mm 15mm 15mm 15mm;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Rubik', sans-serif;
            direction: rtl;
            text-align: right;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            width: 100%;
          }

          .header {
            border-bottom: 2px solid #000000;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title {
            font-size: 24px;
            font-weight: 900;
            color: #000000;
            margin: 0 0 6px 0;
            letter-spacing: -0.025em;
          }
          .header-subtitle {
            font-size: 13px;
            color: #374151;
            margin: 0;
          }
          .meta-date {
            font-size: 12px;
            color: #4b5563;
            text-align: left;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #000000;
            border-bottom: 2px solid #000000;
            padding-bottom: 4px;
            margin-top: 10px;
            margin-bottom: 15px;
            display: inline-block;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #000000;
            padding-top: 15px;
            font-size: 11px;
            color: #4b5563;
            text-align: center;
            page-break-inside: avoid;
          }
          
          /* Card printing styles as requested */
          .card-box {
            background-color: #ffffff !important;
            border: 2px solid #000000 !important;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
            direction: rtl;
            text-align: right;
            color: #000000 !important;
          }

          .card-header-badge {
            font-weight: 800;
            font-size: 13px;
            color: #000000 !important;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 5px;
            margin-bottom: 8px;
            display: block;
          }

          .card-body-text {
            font-size: 14px;
            line-height: 1.6;
            color: #000000 !important;
            margin: 0;
            white-space: pre-wrap;
            font-weight: 500;
          }

          /* Styling of speaker and general instructions inside the PDF */
          .speaker-instruction {
            color: #b45309 !important; /* amber-700 */
            background-color: #fef3c7 !important; /* amber-100 */
            font-style: italic;
            font-size: 13px;
            padding: 1px 4px;
            border-radius: 4px;
            margin: 0 2px;
            display: inline-block;
          }
          .general-instruction {
            color: #3730a3 !important; /* indigo-800 */
            background-color: #e0e7ff !important; /* indigo-100 */
            font-style: italic;
            font-size: 12px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px dashed #c7d2fe;
            margin: 0 2px;
            display: inline-block;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            /* Avoid breaking section headers */
            .section-title, .header, .footer {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="header-title">${title}</h1>
            <p class="header-subtitle">הופק באמצעות סטודיו ההסכתים הדיגיטלי של MTEACH</p>
          </div>
          <div class="meta-date">
            תאריך הפקה: ${dateStr}
          </div>
        </div>

        ${infoHeaderHTML}

        ${contentHTML}

        <div class="footer">
          הופק באופן מקצועי באמצעות סטודיו ההסכתים הדיגיטלי • המכללה לחינוך MTEACH
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper to extract content from Gemini output safely without blocking alerts
  const proceedExtraction = (inputText: string) => {
    if (aiTargetType === 'text') {
      setScriptContent(inputText);
      setScriptMode('text');
      setSuccessMsg('🏆 התסריט הועבר בהצלחה למערכת ההקלטה!');
    } else {
      const parsedCards: ScriptCard[] = [];
      const lines = inputText.split('\n');

      // Look for card boundary separators
      const hasCardDelimiters = lines.some(line =>
        line.includes('=== כרטיסייה') ||
        line.includes('=== כרטיסיה') ||
        line.trim().startsWith('כרטיסייה') ||
        line.trim().startsWith('כרטיסיה') ||
        line.trim().startsWith('כרטיסיית ניווט') ||
        line.trim().startsWith('[כרטיסייה')
      );

      if (hasCardDelimiters) {
        let currentType: 'intro' | 'body' | 'outro' = 'body';
        let currentTextLines: string[] = [];

        const saveCard = () => {
          const cardText = currentTextLines.join('\n').trim();
          if (cardText) {
            parsedCards.push({
              id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: currentType,
              text: cardText
            });
          }
          currentTextLines = [];
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const isDelimiter = line.includes('=== כרטיסייה') ||
                              line.includes('=== כרטיסיה') ||
                              line.match(/^כרטיסייה\s*\d+/i) ||
                              line.match(/^כרטיסיה\s*\d+/i) ||
                              line.match(/^\[כרטיסייה/) ||
                              line.startsWith('כרטיסיית ניווט');

          if (isDelimiter) {
            saveCard();
            if (line.includes('פתיח') || line.toLowerCase().includes('intro')) {
              currentType = 'intro';
            } else if (line.includes('סיכום') || line.includes('סיום') || line.toLowerCase().includes('outro') || line.toLowerCase().includes('conclusion')) {
              currentType = 'outro';
            } else {
              currentType = 'body';
            }
          } else {
            if (line.startsWith('סוג:') || line.startsWith('סוג כרטיסייה:') || line.startsWith('סוג כרטיסיה:')) {
              const typeVal = line.split(':')[1].trim();
              if (typeVal.includes('פתיח')) currentType = 'intro';
              else if (typeVal.includes('סיכום') || typeVal.includes('סיום')) currentType = 'outro';
              else currentType = 'body';
            } else if (line.startsWith('טקסט:') || line.startsWith('תוכן:')) {
              const textVal = line.substring(line.indexOf(':') + 1).trim();
              if (textVal) {
                currentTextLines.push(textVal);
              }
            } else {
              if (lines[i]) {
                currentTextLines.push(lines[i]);
              }
            }
          }
        }
        saveCard();
      }

      // Prefix split fallback
      if (parsedCards.length === 0) {
        let currentType: 'intro' | 'body' | 'outro' = 'body';
        let currentTextLines: string[] = [];

        const saveCard = () => {
          const cardText = currentTextLines.join('\n').trim();
          if (cardText) {
            parsedCards.push({
              id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: currentType,
              text: cardText
            });
          }
          currentTextLines = [];
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const isIntro = line.startsWith('פתיח:') || line.startsWith('[פתיח') || line.toLowerCase().startsWith('intro:');
          const isOutro = line.startsWith('סיכום:') || line.startsWith('סיום:') || line.startsWith('[סיכום') || line.toLowerCase().startsWith('outro:') || line.toLowerCase().startsWith('conclusion:');
          const isBody = line.startsWith('גוף הדיון:') || line.startsWith('גוף:') || line.startsWith('[גוף') || line.toLowerCase().startsWith('body:');

          if (isIntro || isOutro || isBody) {
            saveCard();
            currentType = isIntro ? 'intro' : isOutro ? 'outro' : 'body';
            const content = line.substring(line.indexOf(':') + 1).trim();
            if (content) {
              currentTextLines.push(content);
            }
          } else {
            currentTextLines.push(lines[i]);
          }
        }
        saveCard();
      }

      // Paragraph fallback
      if (parsedCards.length === 0) {
        const paragraphs = inputText.split(/\n\s*\n/);
        paragraphs.forEach((para, idx) => {
          const text = para.trim();
          if (text) {
            let type: 'intro' | 'body' | 'outro' = 'body';
            if (idx === 0) type = 'intro';
            else if (idx === paragraphs.length - 1) type = 'outro';

            parsedCards.push({
              id: `card-${Date.now()}-${idx}`,
              type,
              text
            });
          }
        });
      }

      if (parsedCards.length > 0) {
        setScriptCards(parsedCards);
        setActiveCardIndex(0);
        setScriptMode('cards');
        setSuccessMsg(`🏆 הפקת בהצלחה ${parsedCards.length} כרטיסיות דיון!`);
      } else {
        setErrorMsg('לא הצלחנו לפענח כרטיסיות מהטקסט שהוזן. ודאו שהטקסט בפורמט הנכון.');
      }
    }

    // Auto-close the assistant upon successful injection
    setIsAiAssistantOpen(false);
  };

  // Reset all podcast tracks and starting a fresh project
  const handleClearProject = () => {
    setConfirmModal({
      isOpen: true,
      title: 'איפוס פרויקט והתחלה מחדש 🗑️',
      description: 'האם את/ה בטוח/ה שברצונך למחוק את כל הרצועות, התסריט וכרטיסיות השיחה, ולהתחיל פרויקט חדש? פעולה זו תמחוק את כל הנתונים באופן סופי.',
      confirmText: 'כן, אפס הכל 🗑️',
      cancelText: 'ביטול',
      onConfirm: async () => {
        try {
          // Revoke track URLs
          tracks.forEach((t) => {
            if (t.audioUrl) URL.revokeObjectURL(t.audioUrl);
          });
          setTracks([]);
          stopIndividualTrack();
          
          if (mergedUrl) {
            URL.revokeObjectURL(mergedUrl);
            setMergedUrl(null);
            setMergedBlob(null);
            setMergedDuration(0);
          }
          setIsMergedPlayerPlaying(false);
          if (mergedAudioRef.current) {
            cleanupAudioElement(mergedAudioRef.current);
            mergedAudioRef.current = null;
          }

          // Reset settings and inputs
          setPodcastName("");
          setParticipants("");
          setScriptContent("");
          setScriptCards([]);
          setActiveCardIndex(0);

          // Reset AI Helper States
          setAiStudentNotes("");
          setAiStructure("שיחה בין שני אנשים");
          setAiOutputFormat("תסריט מלא");
          setAiDuration("3 דקות");
          setAiArchetype("בית מדרש");

          // Wipe database
          await clearTracksFromDB();

          setSuccessMsg('🏆 הפרויקט אופס בהצלחה והתחלתם פרויקט חדש!');
        } catch (err) {
          console.error("Failed to clear database during reset:", err);
          setErrorMsg('שגיאה במחיקת הנתונים ממאגר המידע המקומי.');
        }
      }
    });
  };

  // Export entire project as ZIP file containing metadata + raw audio tracks
  const exportProjectToZip = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const zip = new JSZip();

      // Create tracks metadata list
      const tracksMetadata = tracks.map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        trimStart: t.trimStart,
        trimEnd: t.trimEnd,
        volume: t.volume,
        isEffect: t.isEffect || false,
        mimeType: t.blob ? t.blob.type : (t.mimeType || 'audio/wav'),
        fadeInDuration: t.fadeInDuration || 0,
        fadeOutDuration: t.fadeOutDuration || 0,
        silenceAfter: t.silenceAfter || 0
      }));

      const projectData = {
        version: 1,
        podcastName,
        participants,
        scriptContent,
        scriptMode,
        scriptCards,
        activeCardIndex,
        aiStudentNotes,
        aiStructure,
        aiOutputFormat,
        aiDuration,
        aiArchetype,
        tracks: tracksMetadata
      };

      // Add project data JSON to zip
      zip.file("project.json", JSON.stringify(projectData, null, 2));

      // Add each audio track blob
      const audioFolder = zip.folder("audio");
      if (audioFolder) {
        for (const track of tracks) {
          if (track.blob) {
            audioFolder.file(`${track.id}`, track.blob);
          } else {
            console.warn(`Skipping missing audio blob for track ${track.id} on export.`);
          }
        }
      }

      // Generate the ZIP file blob
      const content = await zip.generateAsync({ type: "blob" });

      // Create a download link
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      const sanitizedPodcastName = (podcastName || "הסכת_ללא_שם").trim().replace(/[^a-zA-Z0-9א-ת_-]/g, "_");
      link.href = url;
      link.download = `${sanitizedPodcastName}_גיבוי_סטודיו_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg('🏆 הפרויקט יוצא בהצלחה כקובץ גיבוי ZIP! תוכלו להעלות אותו מחדש בכל זמן.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`שגיאה ביצוא הפרויקט: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Import and reconstruct entire project from ZIP file
  const importProjectFromZip = async (file: File) => {
    if (isImporting) return;
    setIsImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Validate maximum ZIP size to prevent ZIP bombs and excessive resource usage
      const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_ZIP_SIZE) {
        throw new Error("קובץ הגיבוי גדול מדי. הגודל המקסימלי המותר הוא 50MB.");
      }

      const zip = await JSZip.loadAsync(file);
      
      // 1. Read project.json
      const projectJsonFile = zip.file("project.json");
      if (!projectJsonFile) {
        throw new Error("קובץ project.json לא נמצא בתוך ה-ZIP. ודא/י שזהו קובץ גיבוי תקין של המערכת.");
      }

      const projectJsonText = await projectJsonFile.async("text");
      let rawMetadata: any;
      try {
        rawMetadata = JSON.parse(projectJsonText);
      } catch (jsonErr) {
        throw new Error("קובץ ה-project.json בתוך הגיבוי אינו קובץ JSON תקין.");
      }

      // Use the zod schema to validate imported project structure and parameters securely
      const parsed = projectBackupSchema.safeParse(rawMetadata);
      if (!parsed.success) {
        const errorDetails = parsed.error.issues
          .map(issue => `שדה: ${issue.path.join('.') || 'ראשי'} (${issue.message})`)
          .join(' | ');
        throw new Error(`קובץ הגיבוי נכשל באימות הנתונים: ${errorDetails}`);
      }

      const metadata = parsed.data;

      // 2. Load audio files and decode them
      const importedTracks: PodcastTrack[] = [];
      
      for (const trackMeta of metadata.tracks) {
        const audioFile = zip.file(`audio/${trackMeta.id}`);
        if (!audioFile) {
          console.warn(`קובץ השמע עבור רצועה ${trackMeta.id} לא נמצא ב-ZIP, מדלג...`);
          continue;
        }

        const audioBlob = await audioFile.async("blob");
        // Re-type the blob according to metadata
        const typedBlob = new Blob([audioBlob], { type: trackMeta.mimeType });

        // Decode into AudioBuffer for Web Audio API actions
        const audioBuffer = await decodeFileToBuffer(typedBlob);

        // Security/sanity check: ensure decoded audio duration matches constraints
        if (audioBuffer.duration > 300) {
          throw new Error(`רצועת השמע "${trackMeta.name}" ארוכה מדי. המקסימום המותר הוא 5 דקות (300 שניות).`);
        }

        importedTracks.push({
          id: trackMeta.id,
          name: trackMeta.name,
          blob: typedBlob,
          audioUrl: URL.createObjectURL(typedBlob),
          audioBuffer: audioBuffer,
          duration: trackMeta.duration,
          trimStart: trackMeta.trimStart,
          trimEnd: trackMeta.trimEnd,
          volume: trackMeta.volume,
          isEffect: trackMeta.isEffect,
          fadeInDuration: trackMeta.fadeInDuration || 0,
          fadeOutDuration: trackMeta.fadeOutDuration || 0,
          silenceAfter: trackMeta.silenceAfter || 0
        });
      }

      // 3. Clear existing states and tracks
      tracks.forEach(t => {
        if (t.audioUrl) {
          URL.revokeObjectURL(t.audioUrl);
        }
      });

      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
      }
      setMergedUrl(null);
      setMergedBlob(null);
      setMergedDuration(0);
      setIsMergedPlayerPlaying(false);
      if (mergedAudioRef.current) {
        cleanupAudioElement(mergedAudioRef.current);
        mergedAudioRef.current = null;
      }

      // 4. Update settings state
      setPodcastName(metadata.podcastName || '');
      setParticipants(metadata.participants || '');
      setScriptContent(metadata.scriptContent || '');
      setScriptMode(metadata.scriptMode || 'text');
      setScriptCards(metadata.scriptCards || []);
      setActiveCardIndex(metadata.activeCardIndex || 0);
      setAiStudentNotes(metadata.aiStudentNotes || '');
      setAiStructure(metadata.aiStructure || '');
      setAiOutputFormat(metadata.aiOutputFormat || '');
      setAiDuration(metadata.aiDuration || '');
      setAiArchetype(metadata.aiArchetype || '');

      // Set tracks
      setTracks(importedTracks);

      setSuccessMsg('🏆 הפרויקט יובא ושוחזר בהצלחה! כל ההקלטות, הקיטועים וכרטיסיות השיחה עודכנו במלואן.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`שגיאה ביבוא הפרויקט: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Card swipe gesture handlers
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (activeCardIndex < scriptCards.length - 1) {
        setActiveCardIndex(prev => prev + 1);
      }
    } else if (isRightSwipe) {
      if (activeCardIndex > 0) {
        setActiveCardIndex(prev => prev - 1);
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
    setIsMouseDown(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || mouseStartX === null) return;
    const currentX = e.clientX;
    const distance = mouseStartX - currentX;
    if (Math.abs(distance) > 50) {
      if (distance > 50) {
        if (activeCardIndex < scriptCards.length - 1) {
          setActiveCardIndex(prev => prev + 1);
        }
      } else {
        if (activeCardIndex > 0) {
          setActiveCardIndex(prev => prev - 1);
        }
      }
      setIsMouseDown(false);
      setMouseStartX(null);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setMouseStartX(null);
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-zinc-500/30 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#1a1a24] text-zinc-100' : 'bg-[#f4f4f8] text-zinc-900'
    }`}>
      


      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative max-w-md w-full rounded-2xl p-6 shadow-2xl border text-right ${
                isDarkMode 
                  ? 'bg-[#1e1e24] text-zinc-100 border-zinc-800 shadow-black/80' 
                  : 'bg-white text-zinc-800 border-zinc-200 shadow-zinc-400/50'
              }`}
            >
              <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {confirmModal.title}
              </h3>
              <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {confirmModal.description}
              </p>
              <div className="flex flex-row-reverse gap-3">
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {confirmModal.confirmText}
                </button>
                <button
                  onClick={() => setConfirmModal(null)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                    isDarkMode 
                      ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300' 
                      : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {confirmModal.cancelText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Banner / Navigation - Unified Floating Glass Container with Attached Workspace Tabs */}
      <header className={`sticky z-50 mx-auto w-[calc(100%-2rem)] max-w-7xl border border-zinc-700/30 backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
        isScrolled 
          ? 'top-2 p-2 bg-[#1a1a24]/90 border-zinc-700/50 rounded-xl gap-2' 
          : 'top-4 p-3.5 bg-[#252530]/75 border-zinc-700/30 rounded-2xl gap-3.5'
      }`}>
        {/* Top Row: Brand & Recording / Upload Controls */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center text-zinc-100 border border-zinc-700/25 transition-all duration-300 ${
              isScrolled ? 'w-8 h-8 rounded-lg bg-[#2d2d37]/60' : 'w-10 h-10 rounded-xl bg-[#2d2d37]/80'
            }`}>
              <Mic className={`text-[#ffcc00] transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </div>
            <div>
              <h1 className={`font-black tracking-tight text-zinc-100 transition-all duration-300 ${
                isScrolled ? 'text-base' : 'text-lg md:text-xl'
              }`}>
                הסכת בכיתה
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dynamic Scrolled Header Recording Control */}
            <AnimatePresence>
              {mainTab === 'recording' && headerScrolledDown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -12 }}
                  className="flex items-center gap-2"
                >
                  {isRecording ? (
                    <div className="flex items-center gap-2.5 bg-red-950/45 border border-red-800/50 rounded-xl p-1 pr-3 shadow-lg shadow-red-500/5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-xs font-black text-red-400 font-mono">
                          {formatTime(recordingSeconds)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
                      >
                        <Square className="w-2.5 h-2.5 fill-white text-white" />
                        <span>עצור</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="bg-red-600 hover:bg-red-500 text-white active:scale-[0.98] font-black rounded-xl transition-all flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer shadow-md shadow-red-600/15"
                    >
                      <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>הקלטה חדשה</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cog settings button with popover */}
            <div className="hidden sm:block relative">
              <button
                type="button"
                onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                className={`p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] ${
                  showSettingsPopover 
                    ? 'bg-amber-400/10 border-amber-500 text-amber-400' 
                    : 'bg-[#2a2a37]/80 border-zinc-700/40 text-zinc-400 hover:text-white hover:bg-[#323242]'
                }`}
                title="הגדרות אולפן ואחסון"
              >
                <Settings className={`w-5 h-5 transition-transform duration-200 ${showSettingsPopover ? 'rotate-45' : ''}`} />
              </button>

              <AnimatePresence>
                {showSettingsPopover && (
                  <>
                    {/* Clickaway handler */}
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setShowSettingsPopover(false)} 
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-[440px] bg-[#1f1f2a] border border-zinc-700/50 rounded-2xl shadow-2xl p-6 z-50 text-right text-zinc-200 flex flex-col gap-5"
                    >
                      <h4 className="font-black text-sm text-amber-400 border-b border-zinc-800 pb-3 flex items-center justify-between gap-1.5">
                        <span className="text-sm">הגדרות אולפן ואחסון פרויקט</span>
                        <Settings className="w-4 h-4 text-amber-500" />
                      </h4>

                      {/* Studio / Class Mode Switch */}
                      <div className="flex flex-col gap-2">
                        <label className="block text-xs font-black text-zinc-300">מצב איכות הקלטה:</label>
                        <div className="grid grid-cols-2 bg-zinc-950/60 rounded-xl p-1 border border-zinc-800 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRecordingQualityMode('natural')}
                            className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                              recordingQualityMode === 'natural'
                                ? 'bg-[#ffcc00] text-zinc-950 shadow-md'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                          >
                            מצב סטודיו
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordingQualityMode('classroom')}
                            className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                              recordingQualityMode === 'classroom'
                                ? 'bg-[#ffcc00] text-zinc-950 shadow-md'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                          >
                            מצב כיתה
                          </button>
                        </div>
                        
                        <div className="space-y-2.5 text-xs bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/40 leading-relaxed text-zinc-400">
                          <div>
                            <span className="font-bold text-zinc-200">🎙️ מצב סטודיו:</span>
                            <p className="mt-1 text-[11px] leading-relaxed">איכות שמע מלאה, טבעית ומקסימלית ללא סינון רעשים. מומלץ להקלטה בסביבה שקטה או עם מיקרופון מקצועי.</p>
                          </div>
                          <div>
                            <span className="font-bold text-zinc-200">🏫 מצב כיתה:</span>
                            <p className="mt-1 text-[11px] leading-relaxed">סינון רעשים אקטיבי וחכם המותאם במיוחד לכיתה רועשת, לדיבור קרוב ולצמצום רעשי רקע של תלמידים אחרים.</p>
                          </div>
                        </div>
                      </div>

                      {/* Backup & Project Actions */}
                      <div className="border-t border-zinc-800/60 pt-4 flex flex-col gap-3">
                        <label className="block text-xs font-black text-zinc-300">גיבוי וניהול פרויקט:</label>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Export ZIP */}
                          <button
                            onClick={exportProjectToZip}
                            disabled={isExporting}
                            className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer ${
                              isDarkMode 
                                ? 'bg-amber-400/95 hover:bg-amber-400 text-zinc-900' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            style={{ minHeight: '44px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>{isExporting ? 'מייצא פרויקט...' : 'שמירת פרויקט (ZIP)'}</span>
                          </button>

                          {/* Import ZIP */}
                          <label className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-lg transition-all active:scale-95 cursor-pointer border text-center ${
                            isDarkMode 
                              ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border-zinc-700/60' 
                              : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`} style={{ minHeight: '44px' }}>
                            <Upload className="w-4 h-4" />
                            <span>{isImporting ? 'טוען פרויקט...' : 'טעינת פרויקט מ-ZIP'}</span>
                            <input
                              type="file"
                              accept=".zip"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  importProjectFromZip(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Reset project */}
                        <button
                          onClick={handleClearProject}
                          className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer border ${
                            isDarkMode 
                              ? 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-950/60 text-rose-300' 
                              : 'bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-700'
                          }`}
                          style={{ minHeight: '44px' }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>איפוס וניקוי פרויקט ⚠️</span>
                        </button>
                      </div>

                      {/* Recover Pending Sessions inside desktop popup */}
                      {pendingSessions.length > 0 && (
                        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl flex flex-col gap-2 text-right">
                          <span className="text-xs font-bold text-amber-400">נמצאה הקלטה בלתי גמורה!</span>
                          <div className="flex items-center gap-2 justify-between">
                            <button
                              onClick={() => recoverSession(pendingSessions[0])}
                              className="flex-1 py-1.5 bg-amber-500 text-zinc-950 text-xs font-black rounded-lg cursor-pointer flex items-center justify-center gap-1"
                              style={{ minHeight: '40px' }}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
                              <span>שחזר שמע</span>
                            </button>
                            <button
                              onClick={() => discardSession(pendingSessions[0].id)}
                              className="px-3 py-1.5 border border-zinc-700/60 hover:bg-zinc-800/80 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                              style={{ minHeight: '40px' }}
                            >
                              מחק
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Available Space Section */}
                      <div className="pt-3 border-t border-zinc-800/60 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-zinc-400 font-bold">שטח פנוי בדפדפן:</span>
                          <span className="font-bold text-[#ffcc00] font-mono">
                            {storageEstimate 
                              ? `${(storageEstimate.quotaMb - storageEstimate.usedMb).toLocaleString()} MB` 
                              : 'בחישוב...'}
                          </span>
                        </div>
                        {storageEstimate && (
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800/40">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${Math.max(2, 100 - storageEstimate.pct)}%` }}
                            />
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          ההקלטות נשמרות באופן מאובטח בתוך הזיכרון המקומי של הדפדפן (IndexedDB) ואינן נשלחות לשרת חיצוני לצורך שמירה.
                        </p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button - "one 'More' menu button" */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex sm:hidden p-2 rounded-xl transition-all border items-center justify-center cursor-pointer bg-[#2a2a37]/80 border-zinc-700/40 text-zinc-300 hover:text-white hover:bg-[#323242]"
              style={{ minHeight: '44px', minWidth: '44px' }}
              title="תפריט אפשרויות"
            >
              <Menu className="w-5 h-5 text-zinc-200" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Segmented Workspace Tabs - Directly attached to the header to prevent any gap */}
        <div className="flex gap-1.5 w-full bg-[#1b1b22]/90 border border-zinc-800/50 rounded-xl transition-all duration-300 p-1">
          <button
            onClick={() => setMainTab('text')}
            className={`flex-1 font-bold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer rounded-lg px-3 text-xs min-h-[44px] ${
              mainTab === 'text'
                ? 'bg-[#ffcc00]/10 text-[#ffcc00]'
                : 'text-zinc-400 hover:text-[#ffcc00] hover:bg-[#ffcc00]/5'
            }`}
          >
            <FileText className={`transition-colors w-3.5 h-3.5 ${mainTab === 'text' ? 'text-[#ffcc00]' : 'text-zinc-400'}`} />
            <span className="tracking-wide font-black">כתיבה</span>
          </button>
          <button
            onClick={() => setMainTab('recording')}
            className={`flex-1 font-bold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer rounded-lg px-3 text-xs min-h-[44px] ${
              mainTab === 'recording'
                ? 'bg-rose-500/10 text-rose-400'
                : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5'
            }`}
          >
            <Mic className={`transition-colors w-3.5 h-3.5 ${mainTab === 'recording' ? 'text-rose-400' : 'text-zinc-400'}`} />
            <span className="tracking-wide font-black">הקלטה</span>
          </button>
          <button
            onClick={() => setMainTab('tracks')}
            className={`flex-1 font-bold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer rounded-lg px-3 text-xs min-h-[44px] ${
              mainTab === 'tracks'
                ? 'bg-emerald-400/10 text-emerald-400'
                : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/5'
            }`}
          >
            <FileAudio className={`transition-colors w-3.5 h-3.5 ${mainTab === 'tracks' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="tracking-wide font-black">עריכת קול</span>
          </button>
        </div>
      </header>

      {/* Main Container - Adjusted with top padding to account for the floating header */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-10 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CRASH RECOVERY PROMPT */}
        {pendingSessions.length > 0 && (
          <div className="lg:col-span-12 bg-amber-950/25 border border-amber-800/50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black text-amber-200">
                  זוהתה הקלטה בלתי-גמורה מההפעלה הקודמת!
                </h4>
                <p className="text-xs text-amber-400/80 leading-relaxed mt-0.5">
                  מערכת ההגנה של הסטודיו שמרה אוטומטית {pendingSessions.reduce((acc, s) => acc + (s.chunkCount || 0), 0)} מקטעי קול בזמן אמת. האם תרצה לשחזר אותה?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => recoverSession(pendingSessions[0])}
                disabled={isRecovering}
                className="px-4 py-2 bg-[#ffcc00] hover:bg-[#ffdd33] active:scale-[0.98] text-zinc-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isRecovering ? 'משחזר שמע...' : 'שחזר והוסף לעריכה 📂'}
              </button>
              <button
                onClick={() => discardSession(pendingSessions[0].id)}
                disabled={isRecovering}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                התעלם ומחק 🗑️
              </button>
            </div>
          </div>
        )}

        {/* CENTRAL / MAIN PANEL - taking full 12 cols on desktop for a spacious, unified look */}
        <section id="central-workspace" className="lg:col-span-12 flex flex-col gap-6">

          {mainTab === 'text' && (
            <ScriptEditor
              podcastName={podcastName}
              setPodcastName={setPodcastName}
              participants={participants}
              setParticipants={setParticipants}
              scriptContent={scriptContent}
              setScriptContent={setScriptContent}
              scriptMode={scriptMode}
              setScriptMode={setScriptMode}
              scriptCards={scriptCards}
              setScriptCards={setScriptCards}
              teleprompterMode={teleprompterMode}
              setTeleprompterMode={setTeleprompterMode}
              setActiveCardIndex={setActiveCardIndex}
              isDarkMode={isDarkMode}
              setErrorMsg={setErrorMsg}
              setSuccessMsg={setSuccessMsg}
              setConfirmModal={setConfirmModal}
            />
          )}

          {mainTab === 'recording' && (
            <div id="recording-panel" className="flex flex-col gap-6 w-full animate-fadeIn">
              {/* Recording & Upload Section */}
              <div className={`rounded-2xl p-6 shadow-xl border flex flex-col gap-4.5 transition-colors duration-300 bg-[#2d2d37]/45 border-zinc-700/20`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-5 w-full">
                  {/* Right side: Recording details / prompt */}
                  <div className="text-right flex-1">
                    <h3 className="text-base font-black text-zinc-100 flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      מערכת ההקלטה והעלאת קבצים
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                      כאן תוכלו להקליט את עצמכם קוראים את התסריט או להעלות קבצי שמע קיימים. ההקלטות יישמרו אוטומטית במכשירכם ויתווספו לרצועות לעריכת הקול.
                    </p>
                  </div>

                  {/* Left side: Controls */}
                  <div className="flex items-center gap-3.5 justify-end w-full md:w-auto">
                    {/* Upload Audio Tracks Block */}
                    <label className={`flex items-center justify-center gap-2 rounded-xl border transition-all font-black cursor-pointer bg-[#2a2a37]/80 border-zinc-700/40 hover:bg-[#323242] text-zinc-300 hover:text-white px-4 py-2.5 text-xs flex-1 md:flex-initial w-full md:w-auto ${
                      isUploading ? 'opacity-60 cursor-not-allowed' : ''
                    }`}>
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                      ) : (
                        <Upload className="w-4 h-4 text-zinc-300" />
                      )}
                      <span>{isUploading ? 'מפענח...' : 'העלאת קבצי קול'}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        disabled={isUploading}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Direct browser recording container */}
                    <div className={`rounded-xl border flex items-center justify-center transition-all duration-300 flex-1 md:flex-initial w-full md:w-auto ${
                      isRecording 
                        ? 'bg-red-950/25 border-red-800/55 shadow-lg shadow-red-500/5 p-1 px-2' 
                        : 'bg-[#2a2a37]/80 border-zinc-700/40 p-1'
                    }`}>
                      {isRecording ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            <span className="text-xs font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded animate-pulse font-mono">
                              {formatTime(recordingSeconds)}
                            </span>
                          </div>
                          <canvas
                            ref={micCanvasRef}
                            className="w-20 sm:w-28 h-6 bg-[#1c1c22]/90 rounded overflow-hidden border border-zinc-700/20"
                            width={120}
                            height={24}
                          />
                          <button
                            onClick={stopRecording}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
                          >
                            <Square className="w-2.5 h-2.5 fill-white text-white" />
                            <span>עצור</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3 p-1 w-full">
                          <button
                            onClick={startRecording}
                            className="bg-red-600/95 hover:bg-red-600 text-white active:scale-[0.98] font-bold rounded-lg transition-all flex items-center justify-center gap-1 px-3 py-1.5 text-xs cursor-pointer shadow-md shadow-red-600/10 w-full md:w-auto"
                          >
                            <Mic className="w-3 h-3 text-white animate-pulse" />
                            <span>הקלטה חדשה</span>
                          </button>

                          <div className="hidden sm:flex flex-col text-right justify-center border-r border-zinc-800/60 pr-2.5 mr-0.5 leading-none">
                            <span className="text-[9px] font-bold opacity-80 text-zinc-300">שמירה אוטומטית</span>
                            <span className="text-[7px] text-zinc-400 leading-none">בזמן הקלטה</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicator Footer */}
                <div className="border-t border-zinc-700/15 pt-3.5 mt-1 flex flex-col md:flex-row items-center justify-between gap-3 text-right text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-zinc-400 font-bold">מצב הקלטות בפרויקט:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black">
                      {tracks.filter(t => !t.isEffect && !t.isSilence).length} קבצים הוקלטו / הועלו
                    </span>
                  </div>

                  {(() => {
                    const userTracks = tracks.filter(t => !t.isEffect && !t.isSilence);
                    const lastTrack = userTracks.length > 0 ? userTracks[userTracks.length - 1] : null;
                    if (!lastTrack) {
                      return (
                        <span className="text-zinc-500 italic">טרם הוקלטו או הועלו קבצים בפרויקט זה</span>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-zinc-400">שם הקובץ האחרון שהוקלט:</span>
                        <span className="px-2.5 py-1 rounded bg-[#1f1f2a] text-amber-400 border border-zinc-700/50 font-black max-w-[200px] sm:max-w-[300px] truncate" title={lastTrack.name}>
                          {lastTrack.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({(lastTrack.duration || 0).toFixed(1)} שניות)
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Reading View Section */}
              <div id="reading-panel" className="flex flex-col gap-5 rounded-2xl p-6 transition-colors duration-300 w-full bg-[#2d2d37]/45 shadow-xl border border-zinc-700/20">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-700/10">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-rose-400" />
                    <h2 className="text-base font-bold uppercase tracking-wider text-zinc-300">
                      תצוגת קריאה וטלפרומפטר
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-lg">
                    סגנון: {scriptMode === 'cards' ? 'כרטיסיות דיון 🎴' : 'תסריט 📝'}
                  </span>
                </div>

                {scriptMode === 'cards' ? (
              /* CARD-BY-CARD READING MODE */
              <div className="flex flex-col gap-6 flex-1">
                
                {/* Controls at the top */}
                <div className={`p-4 rounded-xl flex items-center justify-between gap-4 text-sm ${
                  isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
                }`}>
                  {/* Font Size control */}
                  <div className="flex items-center gap-2">
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}>גופן:</span>
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                        isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-[#e4e4e7] hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      A-
                    </button>
                    <span className="font-bold w-6 text-center">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                        isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-[#e4e4e7] hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      A+
                    </button>
                  </div>

                  {/* Helper text */}
                  <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    ניתן להחליף כרטיסייה על ידי גרירה או שימוש בחצים למטה
                  </span>
                </div>

                {/* The Card Stage */}
                {scriptCards.length === 0 ? (
                  <div className={`flex-1 rounded-2xl p-12 text-center border-2 border-dashed ${
                    isDarkMode ? 'border-zinc-700/30 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                  }`}>
                    לא נוספו כרטיסיות דיון עדיין. חזור/י למצב עריכה כדי ליצור כרטיסיות.
                  </div>
                ) : (
                  (() => {
                    const activeCard = scriptCards[activeCardIndex] || scriptCards[0];
                    if (!activeCard) return null;
                    
                    return (
                      <div className="flex flex-col gap-4 flex-1">
                        {/* Tinder card stage container */}
                        <div className="relative flex-1 flex items-center justify-center min-h-[310px]">
                          <AnimatePresence mode="wait">
                            <ReadingCard
                              key={activeCardIndex}
                              card={activeCard}
                              index={activeCardIndex}
                              total={scriptCards.length}
                              isDarkMode={isDarkMode}
                              fontSize={fontSize}
                              onSwipeLeft={() => {
                                if (activeCardIndex < scriptCards.length - 1) {
                                  setActiveCardIndex(prev => prev + 1);
                                }
                              }}
                              onSwipeRight={() => {
                                if (activeCardIndex > 0) {
                                  setActiveCardIndex(prev => prev - 1);
                                }
                              }}
                            />
                          </AnimatePresence>
                        </div>

                        {/* Pagination controls with Left arrow (next) and Right arrow (prev) */}
                        <div className="flex items-center justify-between px-2">
                          <button
                            disabled={activeCardIndex === 0}
                            onClick={() => setActiveCardIndex(prev => prev - 1)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                              activeCardIndex === 0
                                ? (isDarkMode 
                                    ? 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed opacity-45' 
                                    : 'border-zinc-200 text-zinc-300 bg-transparent cursor-not-allowed')
                                : (isDarkMode 
                                    ? 'border-zinc-700 text-zinc-200 bg-[#2d2d37] hover:bg-[#373743]' 
                                    : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50')
                            }`}
                          >
                            <ArrowRight className="w-4 h-4 shrink-0" />
                            <span>הקודמת</span>
                          </button>

                          <span className={`text-sm font-bold font-sans ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            כרטיסייה {activeCardIndex + 1} מתוך {scriptCards.length}
                          </span>

                          <button
                            disabled={activeCardIndex === scriptCards.length - 1}
                            onClick={() => setActiveCardIndex(prev => prev + 1)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                              activeCardIndex === scriptCards.length - 1
                                ? (isDarkMode 
                                    ? 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed opacity-45' 
                                    : 'border-zinc-200 text-zinc-300 bg-transparent cursor-not-allowed')
                                : (isDarkMode 
                                    ? 'border-zinc-700 text-zinc-200 bg-[#2d2d37] hover:bg-[#373743]' 
                                    : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50')
                            }`}
                          >
                            <span>הבאה</span>
                            <ArrowLeft className="w-4 h-4 shrink-0" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              /* EXISTING TELEPROMPTER SCROLLING MODE */
              <div className="flex flex-col gap-5 flex-1">
                
                {/* Teleprompter controls */}
                <div className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm ${
                  isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
                }`}>
                  {/* Mobile-only Advanced Settings Toggle Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsTeleprompterSettingsExpanded(!isTeleprompterSettingsExpanded)}
                    className={`flex md:hidden items-center justify-between w-full py-2 px-3.5 rounded-xl font-bold transition-all border text-xs cursor-pointer ${
                      isDarkMode 
                        ? 'bg-[#25252f]/90 hover:bg-[#2d2d39] text-zinc-300 border-zinc-700/50' 
                        : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border-zinc-300/60'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      הגדרות טלפרומפטר מתקדמות
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTeleprompterSettingsExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Settings section: always visible on desktop, expands on click on mobile */}
                  <div className={`flex-col md:flex-row items-start md:items-center gap-5 w-full md:w-auto ${
                    isTeleprompterSettingsExpanded ? 'flex' : 'hidden md:flex'
                  } border-b md:border-b-0 pb-3 md:pb-0 border-zinc-700/10`}>
                    
                    {/* Font Size control */}
                    <div className="flex items-center gap-3 justify-between w-full md:w-auto">
                      <span className={`${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-bold text-xs`}>גופן:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                            isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                          }`}
                        >
                          A-
                        </button>
                        <span className="font-bold w-6 text-center">{fontSize}</span>
                        <button
                          onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                            isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                          }`}
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Speech Rate Segment selector */}
                    <div className="flex items-center gap-3 justify-between w-full md:w-auto">
                      <span className={`${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-bold text-xs`}>קצב דיבור:</span>
                      <div className={`flex rounded-lg p-0.5 ${isDarkMode ? 'bg-[#121216]' : 'bg-zinc-200'}`}>
                        {(['slow', 'normal', 'fast'] as const).map((rate) => {
                          const label = rate === 'slow' ? 'איטי' : rate === 'normal' ? 'רגיל' : 'מהיר';
                          const isActive = speechRate === rate;
                          return (
                            <button
                              key={rate}
                              onClick={() => setSpeechRate(rate)}
                              className={`px-3 py-1 rounded-md transition-all font-bold text-xs cursor-pointer ${
                                isActive
                                  ? (isDarkMode ? 'bg-[#373743] text-white shadow' : 'bg-white text-zinc-900 shadow')
                                  : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Auto Scroll Toggles: Always visible */}
                  <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                    <button
                      onClick={() => {
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                        setIsScrolling(false);
                        setActiveWordIndex(0);
                      }}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs flex-1 md:flex-none w-full md:w-auto ${
                        isDarkMode 
                          ? 'bg-[#2a2a35] hover:bg-[#343442] text-zinc-300 border border-zinc-700/50' 
                          : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>התחל מחדש</span>
                    </button>

                    <button
                      onClick={() => setIsScrolling(!isScrolling)}
                      className={`px-5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer flex-1 md:flex-none w-full md:w-auto text-center flex items-center justify-center ${
                        isScrolling
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : (isDarkMode ? 'bg-zinc-200 text-zinc-950 hover:bg-white' : 'bg-zinc-800 text-white hover:bg-zinc-900')
                      }`}
                    >
                      {isScrolling ? 'עצור גלילה' : 'הפעל גלילה'}
                    </button>
                  </div>

                </div>

                {/* Scrolling Text Stage */}
                <div
                  ref={scrollContainerRef}
                  className={`flex-1 rounded-2xl p-6 overflow-y-auto max-h-[380px] scroll-smooth relative ${
                    isDarkMode ? 'bg-[#18181f] border border-zinc-700/20' : 'bg-zinc-100/60'
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {/* Visual Reading Target line marker */}
                  {guideLineHeight > 0 && (
                    <div 
                      className={`absolute left-0 right-0 pointer-events-none transition-all duration-200 ${
                        isDarkMode ? 'bg-emerald-500/10 border-y border-emerald-500/25' : 'bg-emerald-500/5 border-y border-emerald-500/15'
                      }`}
                      style={{
                        top: `${guideLineTop}px`,
                        height: `${guideLineHeight}px`
                      }}
                    />
                  )}
                  
                  <div className="leading-relaxed font-bold select-none pt-2 pb-48 px-2 text-right space-y-4" style={{ direction: 'rtl' }}>
                    {parsedWords.length === 0 || (parsedWords.length === 1 && parsedWords[0].isEmpty) ? (
                      <span className={isDarkMode ? 'text-zinc-600 italic' : 'text-zinc-400 italic'}>לא נכתב תסריט עדיין. חזור/י למצב עריכה כדי להזין טקסט.</span>
                    ) : (
                      parsedWords.map((paragraph, pIdx) => {
                        if (paragraph.isEmpty) {
                          return <div key={pIdx} className="h-4" />;
                        }
                        return (
                          <div key={pIdx} className="block text-right leading-relaxed mb-4">
                            {paragraph.lineWords.map((wordObj) => {
                              const isCurrent = wordObj.index === activeWordIndex;
                              const isPast = wordObj.index < activeWordIndex;
                              return (
                                <span
                                  key={wordObj.index}
                                  id={`app-word-${wordObj.index}`}
                                  onClick={() => setActiveWordIndex(wordObj.index)}
                                  className={`transition-all duration-200 rounded px-1.5 py-0.5 inline-block mx-1 cursor-pointer ${
                                    isCurrent
                                      ? (isDarkMode ? 'text-black bg-white scale-110 shadow-lg font-black' : 'text-white bg-zinc-850 scale-110 shadow font-black')
                                      : isPast
                                      ? (isDarkMode ? 'text-zinc-700 font-bold' : 'text-zinc-300 font-bold')
                                      : wordObj.isSpeakerInstruction
                                      ? (isDarkMode ? 'text-amber-400 bg-amber-500/5 italic font-medium' : 'text-amber-700/90 bg-amber-500/5 italic font-medium')
                                      : wordObj.isGeneralInstruction
                                      ? (isDarkMode ? 'text-indigo-300 bg-indigo-500/10 italic font-semibold border-b border-dashed border-indigo-500/30 text-[0.9em]' : 'text-indigo-800 bg-indigo-50 italic font-semibold border-b border-dashed border-indigo-300 text-[0.9em]')
                                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-800 hover:text-zinc-950')
                                  }`}
                                >
                                  {wordObj.word}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>💡 קרא/י לאורך הקו המנחה הירוק</span>
                </div>

              </div>
            )}
            </div>
          </div>
          )}

          {mainTab === 'tracks' && (
            <div className="flex flex-col gap-6 w-full">

              {/* Tracks List (רשימת רצועות הקול) */}
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
                  <Scissors className="w-6 h-6 animate-pulse" />
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
                  <span> הוסף פתיח, מעבר או אפקט מוזיקלי</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                
                {tracks.map((track, index) => {
                  const isPlaying = playingTrackId === track.id;
                  const trimmedDuration = track.trimEnd - track.trimStart;
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
                      className={`p-3.5 sm:p-5 rounded-xl transition-all flex flex-col gap-3 sm:gap-4 relative select-none ${
                        isBeingDragged
                          ? 'opacity-30 border-2 border-dashed border-zinc-500 bg-[#121216]/50 scale-[0.99]'
                          : isHoveredOver
                          ? 'bg-zinc-800/10 scale-[1.01] shadow-lg'
                          : (isDarkMode ? 'bg-[#373743] text-zinc-100 shadow-sm border border-zinc-700/20' : 'bg-zinc-100/70 text-zinc-900')
                      }`}
                    >
                      
                      {/* Drag Edge Handle / Visual Indicator */}
                      <div className={`absolute right-0 top-0 bottom-0 w-1.5 rounded-r-xl pointer-events-none ${
                        getTrackColorClass(track.name, !!track.isEffect)
                      }`} />

                      {/* Inline Deletion Confirmation Overlay */}
                      {confirmDeleteTrackId === track.id && (
                        <div className="absolute inset-0 bg-zinc-950/95 rounded-xl z-50 flex flex-col items-center justify-center gap-3 p-4 text-center">
                          <p className="text-sm font-bold text-white">האם אתה בטוח שברצונך למחוק את הרצועה "{track.name}"?</p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteTrack(track.id);
                                setConfirmDeleteTrackId(null);
                              }}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              כן, מחק
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTrackId(null)}
                              className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mobile Header (Hidden on Desktop) */}
                      <div className="flex md:hidden items-center justify-between gap-2.5 w-full pr-1.5">
                        {/* Left Controls: Trash */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTrackId(track.id)}
                            title="מחק רצועה"
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-red-950/40 hover:bg-red-900/30 text-red-400' 
                                : 'bg-red-100 hover:bg-red-200 text-red-700 shadow-sm'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Middle: Title */}
                        <div className="flex-1 min-w-0 mx-1">
                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrackField(track.id, 'name', e.target.value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold focus:outline-none w-full ${
                              isDarkMode ? 'bg-[#2d2d37] text-white focus:ring-1 focus:ring-zinc-700' : 'bg-zinc-200 text-zinc-900 focus:ring-1 focus:ring-zinc-300 shadow-sm'
                            }`}
                          />
                        </div>

                        {/* Right: Play, Volume, and Reordering Arrows */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Play Cut */}
                          <button
                            type="button"
                            onClick={() => playIndividualTrackSegment(track)}
                            title={isPlaying ? "עצור השמעת קטע חתוך" : "האזן לקטע החתוך"}
                            className={`p-1.5 rounded-lg transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                              isPlaying
                                ? 'bg-[#ffcc00] text-zinc-950 font-bold shadow animate-pulse'
                                : (isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-700 shadow-sm')
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          {/* Individual Volume Control (Button with Popover) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenVolumeTrackId(openVolumeTrackId === track.id ? null : track.id);
                              }}
                              className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                isDarkMode ? 'bg-[#2d2d37]' : 'bg-zinc-200 shadow-sm'
                              }`}
                              title={`עוצמת שמע: ${Math.round(track.volume * 100)}%`}
                            >
                              {track.volume === 0 ? (
                                <VolumeX className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <Volume2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`} />
                              )}
                            </button>
                            
                            <AnimatePresence>
                              {openVolumeTrackId === track.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40 cursor-default" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenVolumeTrackId(null);
                                    }} 
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-2.5 rounded-xl flex flex-col items-center gap-2 shadow-xl border ${
                                      isDarkMode ? 'bg-[#1e1e24] border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={track.volume}
                                        onChange={(e) => updateTrackField(track.id, 'volume', Number(e.target.value))}
                                        className="w-20 h-1 accent-[#ffcc00] bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <span className="font-bold text-xs min-w-[28px] text-center">
                                        {Math.round(track.volume * 100)}%
                                      </span>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title="הזז למעלה"
                            className={`p-1 rounded-lg transition-all ${
                              index === 0
                                ? 'opacity-30 cursor-not-allowed'
                                : (isDarkMode ? 'hover:bg-[#434351] text-zinc-400 hover:text-white' : 'hover:bg-zinc-300 text-zinc-500 hover:text-zinc-800')
                            }`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === tracks.length - 1}
                            title="הזז למטה"
                            className={`p-1 rounded-lg transition-all ${
                              index === tracks.length - 1
                                ? 'opacity-30 cursor-not-allowed'
                                : (isDarkMode ? 'hover:bg-[#434351] text-zinc-400 hover:text-white' : 'hover:bg-zinc-300 text-zinc-500 hover:text-zinc-800')
                            }`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop Header (Hidden on Mobile) */}
                      <div className="hidden md:flex items-center justify-between gap-3 w-full pr-2">
                        {/* Left: Drag Handle and Track Name Input */}
                        <div className="flex items-center gap-2.5 flex-1">
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

                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrackField(track.id, 'name', e.target.value)}
                            className={`rounded-lg px-3 py-1.5 text-base font-bold focus:outline-none w-full max-w-md ${
                              isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-white focus:ring-1 focus:ring-zinc-700' : 'bg-zinc-200 hover:bg-zinc-150 text-zinc-900 focus:ring-1 focus:ring-zinc-300 shadow-sm'
                            }`}
                          />
                        </div>

                        {/* Right Controls: Play Cut, Volume, Move Up/Down, and Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Play Cut */}
                          <button
                            type="button"
                            onClick={() => playIndividualTrackSegment(track)}
                            title={isPlaying ? "עצור השמעה" : "האזן לקטע החתוך"}
                            className={`p-2 rounded-lg transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                              isPlaying
                                ? 'bg-[#ffcc00] text-zinc-950 font-bold shadow animate-pulse'
                                : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 shadow-sm')
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                          </button>

                          {/* Individual Volume Control (Button with Popover) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenVolumeTrackId(openVolumeTrackId === track.id ? null : track.id);
                              }}
                              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351]' : 'bg-zinc-200 hover:bg-zinc-300 shadow-sm'
                              }`}
                              title={`עוצמת שמע: ${Math.round(track.volume * 100)}%`}
                            >
                              {track.volume === 0 ? (
                                <VolumeX className="w-4 h-4 text-red-400" />
                              ) : (
                                <Volume2 className={`w-4 h-4 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`} />
                              )}
                            </button>
                            
                            <AnimatePresence>
                              {openVolumeTrackId === track.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40 cursor-default" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenVolumeTrackId(null);
                                    }} 
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-2.5 rounded-xl flex flex-col items-center gap-2 shadow-xl border ${
                                      isDarkMode ? 'bg-[#1e1e24] border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={track.volume}
                                        onChange={(e) => updateTrackField(track.id, 'volume', Number(e.target.value))}
                                        className="w-20 h-1 accent-[#ffcc00] bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <span className="font-bold text-xs min-w-[28px] text-center">
                                        {Math.round(track.volume * 100)}%
                                      </span>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Move up */}
                          <button
                            type="button"
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

                          {/* Move down */}
                          <button
                            type="button"
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

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTrackId(track.id)}
                            title="מחק רצועה"
                            className={`p-2 rounded-lg transition-all ${
                              isDarkMode 
                                ? 'bg-red-950/40 hover:bg-red-900/30 text-red-400' 
                                : 'bg-red-100 hover:bg-red-200 text-red-700 shadow-sm'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Timeline Wave Visual & Premium dual Trimming controls */}
                      <div className={`p-2.5 sm:p-4 rounded-xl flex flex-col gap-2.5 sm:gap-3.5 ${
                        isDarkMode ? 'bg-[#1c1c22]/30' : 'bg-zinc-200/40'
                      }`}>
                        
                        <div className="w-full">
                          {/* Premium direct manipulation TrackTimeline component with inline overlay controls */}
                          <TrackTimeline
                            track={track}
                            onTrimChange={updateTrackTrim}
                            onChangeField={updateTrackField}
                            isDarkMode={isDarkMode}
                          />
                        </div>



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

          {/* Global Merging & Export (מיזוג וייצוא) */}
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

            {/* Advanced Audio Options Panel */}
            <div className={`rounded-xl border flex flex-col overflow-hidden transition-all ${
              isDarkMode ? 'bg-[#18181f] border-zinc-700/20' : 'bg-zinc-50 border-zinc-200'
            }`}>
              {/* Header Toggle */}
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
                        פורמט: {exportFormat.toUpperCase()} | {useCrossfade ? 'מצב מעבר רך פעיל' : 'ללא מעבר רך'} | {useNormalization ? 'הגנה מפני עיוותים פעילה' : 'ללא הגנה מעיוותים'} | {useDucking ? 'הנמכת מוזיקה פעילה' : 'ללא הנמכה'}
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
                              <div className="text-xs font-bold">קובץ גדול / מאסטר לא דחוס (WAV)</div>
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
                              <div className="text-xs font-bold">קובץ קל לשיתוף (WebM / Opus)</div>
                              <div className="text-[10px] mt-0.5 text-zinc-500">דחוס וחסכוני ביותר | מהיר להעלאה ושיתוף</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Advanced Transition Options checkboxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-700/10">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useCrossfade}
                            onChange={(e) => setUseCrossfade(e.target.checked)}
                            className="w-4 h-4 mt-0.5 accent-indigo-500 cursor-pointer"
                          />
                          <div className="text-right">
                            <div className="text-xs font-bold">מעבר רך (Crossfade)</div>
                            <div className="text-[10px] mt-0.5 leading-normal text-zinc-500">חפיפה חלקה של 1.5 ש' בין קטעים</div>
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
                            <div className="text-xs font-bold">הגנה מפני עיוותים (Clip Protection)</div>
                            <div className="text-[10px] mt-0.5 leading-normal text-zinc-500">מניעת צרימות ועיוותי שמע בעוצמות גבוהות</div>
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
                            <div className="text-xs font-bold">הנמכת מוזיקה (Auto-Ducking)</div>
                            <div className="text-[10px] mt-0.5 leading-normal text-zinc-500">החלשת מוזיקה אוטומטית בזמן דיבור</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Project Duration and Memory Warning */}
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
                    <div className="leading-normal">
                      <div className="font-bold mb-1">⚠️ פרויקט ארוך במיוחד זוהה ({formatTime(totalDurationSec)})</div>
                      <span>מאחר והעיבוד מתבצע כולו ישירות בדפדפן, פרויקטים מעל 10 דקות עלולים לגזול זיכרון רב בדפדפנים ניידים או ישנים. מומלץ לעבוד במחשב שולחני או לפצל את ההסכת לקטעים קצרים יותר.</span>
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
                  <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
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
                  <span>מעבד, חותך ומחבר את קטעי השמע...</span>
                </>
              ) : isCompressing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>מקודד ומכווץ שמע ({compressProgress}%)...</span>
                </>
              ) : !hasUnmergedChanges ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>ההסכת מעודכן ומוזג בהצלחה</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  <span>חבר קטעי קול להסכת</span>
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
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 inline-block ${
                      isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                    }`}>
                      קובץ מוכן לייצוא!
                    </span>
                    <h4 className="text-base font-bold">הסכת מאוחד ומעובד סופית</h4>
                    <p className={`text-xs font-bold mt-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      משך כולל: {formatTime(mergedDuration)} שניות | {tracks.length} קטעים מחוברים | קובץ {exportFormat === 'webm' ? 'WebM/Opus קל ודחוס' : 'WAV באיכות גבוהה'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    
                    {/* Preview merged audio */}
                    <button
                      onClick={toggleMergedAudio}
                      className={`px-4 py-2.5 text-sm rounded-xl font-bold transition-all flex items-center gap-2 ${
                        isMergedPlayerPlaying
                          ? (isDarkMode ? 'bg-[#373743] text-white' : 'bg-zinc-200 text-zinc-900 shadow-sm')
                          : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-sm')
                      }`}
                    >
                      {isMergedPlayerPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>עצור השמעה</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>האזן להסכת המוכן</span>
                        </>
                      )}
                    </button>

                    {/* Download Final Podcast button */}
                    <a
                      href={mergedUrl}
                      download={`podcast_studio_export_${Date.now()}.${exportFormat === 'webm' ? 'webm' : 'wav'}`}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isDarkMode ? 'bg-zinc-200 hover:bg-white text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-sm'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>הורד הסכת מוכן</span>
                    </a>

                  </div>

                </div>

              </motion.div>
            )}

          </div>

        </div>
      )}

    </section>

  </main>

      {/* Footer */}
      <footer className={`py-8 text-center text-sm transition-colors duration-300 mt-12 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-500' : 'bg-zinc-100 text-zinc-600'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="font-bold text-right md:text-right">
              אולפן הסכתים אקדמי לסטודנטים – נבנה עבור עריכה קלה, הקלטה ישירה ומיזוג קבצים בדפדפן.
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'} text-right md:text-right`}>
              כל הפעולות מתבצעות מקומית על המעבד בדפדפן ללא שמירה בשרת חיצוני.
            </p>
          </div>
          
          {/* Seminar HaKibbutzim Logo & Subtitle */}
          <div className="flex items-center gap-3 select-none shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm tracking-tight shadow-sm shrink-0 ${
              isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
            }`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 4H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <div className="text-right flex flex-col">
              <span className={`text-base font-bold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>סמינר הקיבוצים</span>
              <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>מרכז החדשנות</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Freesound Assets Modal */}
      {isFreesoundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFreesoundModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className={`relative w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1e1e24] border-zinc-700/50 text-zinc-100' 
              : 'bg-white border-zinc-200 text-zinc-800'
          }`} style={{ direction: 'rtl' }}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-zinc-700/40 bg-[#16161b]' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold">🎵 מאגר קטעי קול ומוזיקה לפודקאסט</h3>
              </div>
              <button
                onClick={() => setIsFreesoundModalOpen(false)}
                className={`p-2 rounded-lg transition-all text-xs cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                }`}
              >
                ✕ סגור
              </button>
            </div>

            {/* Category Tabs (Filter Buttons) */}
            <div className={`p-4 flex flex-col lg:flex-row items-center gap-4 justify-between border-b ${
              isDarkMode ? 'border-zinc-700/30' : 'border-zinc-100'
            }`}>
              <div className={`flex flex-wrap sm:flex-nowrap rounded-xl p-1 gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-950/60`}>
                <button
                  onClick={() => {
                    setFreesoundCategory('intro');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'intro'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>🎵 אות פתיחה (Intro)</span>
                </button>
                <button
                  onClick={() => {
                    setFreesoundCategory('transition');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'transition'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>✨ מנגינת מעבר (Transition)</span>
                </button>
                <button
                  onClick={() => {
                    setFreesoundCategory('outro');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'outro'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>🎬 אות סיום (Outro)</span>
                </button>
              </div>

              {/* Controls: More Variety + Free Search */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleFreesoundMoreVariety}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm ${
                    isDarkMode 
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700/80 text-indigo-400 hover:text-indigo-300' 
                      : 'bg-white hover:bg-zinc-100 border-zinc-200 text-indigo-600 hover:text-indigo-700'
                  }`}
                  title="בחר מילת חיפוש אקראית אחרת מתוך המאגר"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span>רענון מגוון (חיפוש אקראי)</span>
                </button>

                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="חיפוש חופשי ב-Freesound..."
                    value={freesoundSearchQuery}
                    onChange={(e) => setFreesoundSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery, freesoundSort);
                      }
                    }}
                    className={`w-full py-2 pl-3 pr-9 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-900 text-zinc-100 placeholder-zinc-500 border border-zinc-700/50' 
                        : 'bg-zinc-50 text-zinc-800 placeholder-zinc-400 border border-zinc-300'
                    }`}
                  />
                  <button
                    onClick={() => fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery, freesoundSort)}
                    className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
              
              {freesoundLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    טוען קבצי שמע מ-Freesound...
                  </p>
                </div>
              ) : (
                (() => {
                  const filteredHits = freesoundResults.filter((hit) => {
                    const d = hit.duration;
                    if (d === undefined || d === null || typeof d !== 'number' || isNaN(d)) {
                      return true;
                    }
                    if (freesoundCategory === 'intro' || freesoundCategory === 'outro' || freesoundCategory === 'transition') {
                      return d <= 10;
                    }
                    return true;
                  });

                  if (filteredHits.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                        <p className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          לא נמצאו תוצאות מתאימות למגבלת הזמן או שהשירות אינו זמין
                        </p>
                        <p className="text-xs text-zinc-500 max-w-sm">
                          נסו ללחוץ על "רענון מגוון" או לבצע חיפוש חופשי אחר.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {filteredHits.map((hit, index) => {
                        const isPreviewPlaying = previewPlayingId === hit.id;
                        const durationText = hit.duration ? `${Math.floor(hit.duration)} שניות` : 'שמע';
                        const tagsList = (hit.tags && hit.tags.length > 0) ? hit.tags.slice(0, 3).join(', ') : 'שמע';

                        return (
                          <div
                            key={`${hit.id}-${index}`}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                              isDarkMode
                                ? 'bg-[#272733]/40 hover:bg-[#272733]/80 border-zinc-700/30'
                                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                            }`}
                          >
                            {/* Audio Details */}
                            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                              {/* Play/Preview Button */}
                              <button
                                onClick={() => togglePreviewAudio(hit.id, hit.previews['preview-hq-mp3'] || hit.previews['preview-lq-mp3'])}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow transition-all cursor-pointer ${
                                  isPreviewPlaying
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                                title={isPreviewPlaying ? "עצור השמעה" : "השמעת דוגמה"}
                              >
                                {isPreviewPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current mr-0.5" />
                                )}
                              </button>

                              <div className="flex flex-col text-right">
                                <span className="font-bold text-xs sm:text-sm line-clamp-1" title={hit.name}>
                                  {hit.name || tagsList}
                                </span>
                                <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${
                                  isDarkMode ? 'text-zinc-500' : 'text-zinc-500'
                                }`}>
                                  ⏱️ משך: {durationText} | יוצר: {hit.username || 'Freesound'} | רישיון: {hit.license ? hit.license.split('/').pop() : 'CC'}
                                </span>
                              </div>
                            </div>

                            {/* Add to project Button */}
                            <button
                              onClick={() => handleAddFreesoundTrack(hit)}
                              className={`w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                                isDarkMode
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>הוסף לפרויקט</span>
                            </button>

                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}

            </div>

            {/* Modal Footer */}
            <div className={`p-3 text-center text-[10px] font-bold select-none border-t ${
              isDarkMode ? 'border-zinc-700/30 bg-[#16161b]' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <p className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}>
                כל קטעי השמע במאגר מסופקים ברישיון חופשי לשימוש באדיבות Freesound API.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-55 flex justify-end" style={{ direction: 'rtl' }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Drawer Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative w-full h-full flex flex-col p-6 sm:p-10 shadow-2xl z-50 overflow-y-auto ${
                isDarkMode ? 'bg-[#1b1b24] text-zinc-100 border-zinc-800' : 'bg-white text-zinc-850 border-zinc-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-zinc-700/25 mb-6">
                <span className="font-black text-xl sm:text-2xl text-amber-400">הגדרות ואפשרויות פרויקט</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-zinc-800/80 dark:bg-zinc-800 hover:opacity-80 cursor-pointer min-h-[44px] flex items-center justify-center gap-1 border border-zinc-700/50"
                >
                  ✕ סגור
                </button>
              </div>

              <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
                {/* Quality & Storage Settings */}
                <div className="p-5 rounded-2xl border border-zinc-750 bg-zinc-950/35 flex flex-col gap-5 text-right">
                  <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm justify-end">
                    <span className="text-base font-black">איכות שמע ואחסון אולפן</span>
                    <Settings className="w-5 h-5 text-amber-500" />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-zinc-300">איכות הקלטה:</span>
                    <div className="grid grid-cols-2 bg-zinc-950/60 rounded-xl p-1 border border-zinc-800 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRecordingQualityMode('natural')}
                        className={`py-3 text-sm font-black rounded-lg transition-all cursor-pointer ${
                          recordingQualityMode === 'natural'
                            ? 'bg-[#ffcc00] text-zinc-950 shadow-md'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '48px' }}
                      >
                        מצב סטודיו
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordingQualityMode('classroom')}
                        className={`py-3 text-sm font-black rounded-lg transition-all cursor-pointer ${
                          recordingQualityMode === 'classroom'
                            ? 'bg-[#ffcc00] text-zinc-950 shadow-md'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '48px' }}
                      >
                        מצב כיתה
                      </button>
                    </div>

                    <div className="space-y-3 text-xs bg-zinc-950/30 p-3.5 rounded-xl border border-zinc-850 leading-relaxed text-zinc-400 mt-1">
                      <div>
                        <span className="font-bold text-zinc-200 text-xs">🎙️ מצב סטודיו:</span>
                        <p className="mt-1 text-xs text-zinc-400">איכות שמע מלאה, טבעית ומקסימלית ללא סינון רעשים. מומלץ להקלטה בסביבה שקטה.</p>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-200 text-xs">🏫 מצב כיתה:</span>
                        <p className="mt-1 text-xs text-zinc-400">סינון רעשים אקטיבי וחכם המותאם במיוחד לכיתה רועשת, לדיבור קרוב ולצמצום רעשי רקע.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-zinc-850 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-xs text-zinc-400 font-bold">שטח פנוי בדפדפן:</span>
                      <span className="font-bold text-[#ffcc00] font-mono text-sm">
                        {storageEstimate 
                          ? `${(storageEstimate.quotaMb - storageEstimate.usedMb).toLocaleString()} MB` 
                          : 'בחישוב...'}
                      </span>
                    </div>
                    {storageEstimate && (
                      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800/40">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${Math.max(2, 100 - storageEstimate.pct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Import/Export / Reset */}
                <div className="flex flex-col gap-3 text-right">
                  <span className="text-sm font-bold text-zinc-400">גיבוי וניהול פרויקט (מקומי)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      onClick={() => {
                        exportProjectToZip();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                        isDarkMode ? 'bg-[#ffcc00] hover:bg-[#ffe066] text-zinc-950 shadow-md' : 'bg-indigo-600 text-white'
                      }`}
                      style={{ minHeight: '52px' }}
                    >
                      <Download className="w-5 h-5" />
                      <span>שמירת פרויקט (ZIP) 📦</span>
                    </button>

                    <label className={`w-full py-3.5 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer text-center transition-all active:scale-95 border ${
                      isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`} style={{ minHeight: '52px' }}>
                      <Upload className="w-5 h-5" />
                      <span>טעינת פרויקט מ-ZIP 📁</span>
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            importProjectFromZip(e.target.files[0]);
                          }
                          setIsMobileMenuOpen(false);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => {
                      handleClearProject();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-black bg-rose-900/20 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                    style={{ minHeight: '52px' }}
                  >
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <span>איפוס וניקוי פרויקט לגמרי ⚠️</span>
                  </button>
                </div>

                {/* Recovery Banner if exists inside mobile drawer too */}
                {pendingSessions.length > 0 && (
                  <div className="p-4 bg-amber-950/25 border border-amber-800/40 rounded-2xl flex flex-col gap-3 text-right">
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1.5 justify-end">
                      <span>נמצאה הקלטה בלתי גמורה!</span>
                      <span className="animate-pulse">⚠️</span>
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      הקלטה מהסשן האחרון שלכם לא נסגרה כמו שצריך. תוכלו לשחזר אותה כעת ולהכניס אותה ישירות לעריכה.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          recoverSession(pendingSessions[0]);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex-1 py-3 bg-amber-500 text-zinc-950 text-sm font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                        style={{ minHeight: '48px' }}
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>שחזר שמע</span>
                      </button>
                      <button
                        onClick={() => {
                          discardSession(pendingSessions[0].id);
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-4 py-3 border border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 text-sm font-bold rounded-xl cursor-pointer"
                        style={{ minHeight: '48px' }}
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Naming / Classification Dialog Modal */}
      <AnimatePresence>
        {pendingNameTrackId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ direction: 'rtl' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-md p-6 rounded-2xl border shadow-2xl text-right overflow-hidden ${
                isDarkMode ? 'bg-[#1b1b24] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              {/* Top glow or design element */}
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-[#ffcc00]" />

              <h3 className="text-lg font-black mb-1 flex items-center gap-2 justify-start">
                <span className="text-[#ffcc00] text-xl">🎙️</span>
                <span>איך לקרוא להקלטה?</span>
              </h3>
              <p className={`text-xs mb-5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                כדי שיהיה קל לזהות ולערוך, בחרו סיווג מהיר או כתבו שם מותאם אישית:
              </p>

              {/* Editable Text Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-zinc-400 mb-2">שם הרצועה:</label>
                <input
                  type="text"
                  value={pendingTrackName}
                  onChange={(e) => setPendingTrackName(e.target.value)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ffcc00]/50 border transition-all ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-400'
                  }`}
                  placeholder="לדוגמה: 01 פתיח"
                />
              </div>

              {/* Quick Classify Buttons Grid */}
              <div className="mb-6">
                <span className="block text-xs font-bold text-zinc-400 mb-2">סיווג מהיר (מוסיף מספור אוטומטי):</span>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const match = pendingTrackName.match(/(\d+)/);
                    const serialPrefix = match ? match[1] : "01";
                    
                    const categories = [
                      { label: "פתיח", value: `${serialPrefix} פתיח` },
                      { label: "גוף", value: `${serialPrefix} גוף` },
                      { label: "סיכום", value: `${serialPrefix} סיכום` },
                      { label: "ראיון", value: `${serialPrefix} ראיון` },
                      { label: "מחשבה", value: `${serialPrefix} מחשבה` },
                    ];

                    return (
                      <>
                        {categories.map((cat) => {
                          const isActive = pendingTrackName === cat.value;
                          let btnClass = '';
                          
                          if (cat.label === 'פתיח') {
                            btnClass = isActive
                              ? 'bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-600/25 font-black'
                              : isDarkMode
                                ? 'bg-indigo-950/25 border-indigo-800/40 text-indigo-300 hover:bg-indigo-950/45'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100';
                          } else if (cat.label === 'גוף') {
                            btnClass = isActive
                              ? 'bg-emerald-600 border-transparent text-white shadow-md shadow-emerald-600/25 font-black'
                              : isDarkMode
                                ? 'bg-emerald-950/25 border-emerald-800/40 text-emerald-300 hover:bg-emerald-950/45'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
                          } else if (cat.label === 'סיכום') {
                            btnClass = isActive
                              ? 'bg-amber-500 border-transparent text-zinc-950 shadow-md shadow-amber-500/25 font-black'
                              : isDarkMode
                                ? 'bg-amber-950/25 border-amber-800/40 text-amber-300 hover:bg-amber-950/45'
                                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
                          } else {
                            btnClass = isActive
                              ? 'bg-[#ffcc00] border-transparent text-zinc-950 shadow-md shadow-yellow-600/25 font-black'
                              : isDarkMode
                                ? 'bg-zinc-800/50 border-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700';
                          }

                          return (
                            <button
                              key={cat.label}
                              type="button"
                              onClick={() => setPendingTrackName(cat.value)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center min-h-[44px] ${btnClass}`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            const defaultName = `טייק ${serialPrefix}`;
                            setPendingTrackName(defaultName);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center min-h-[44px] ${
                            pendingTrackName.startsWith('טייק')
                              ? 'bg-zinc-700 border-transparent text-zinc-100 font-black'
                              : isDarkMode
                                ? 'bg-zinc-800/50 border-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          אחר
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingNameTrackId) {
                      updateTrackField(pendingNameTrackId, 'name', pendingTrackName);
                    }
                    setPendingNameTrackId(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-black bg-[#ffcc00] hover:bg-[#ffdd33] text-zinc-950 shadow-lg cursor-pointer text-center min-h-[44px]"
                >
                  שמור שם 💾
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingNameTrackId(null);
                  }}
                  className={`py-3 px-4 rounded-xl text-sm font-bold cursor-pointer text-center min-h-[44px] ${
                    isDarkMode ? 'bg-zinc-800 hover:bg-zinc-755 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  השאר כך
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2rem)]" style={{ direction: 'rtl' }}>
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-[#1e1416]/95 border border-red-800/60 text-red-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-[2px] bg-red-500" />
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-red-400 mb-0.5">שגיאה</span>
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-zinc-500 hover:text-zinc-300 font-bold text-sm cursor-pointer">×</button>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-[#121c16]/95 border border-emerald-800/60 text-emerald-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-[2px] bg-emerald-500" />
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-emerald-400 mb-0.5">הצלחה</span>
                <span className="leading-relaxed">{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-zinc-500 hover:text-zinc-300 font-bold text-sm cursor-pointer">×</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
