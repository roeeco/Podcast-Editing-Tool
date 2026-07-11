import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { PodcastTrack, ScriptCard } from '../types';
import { 
  getConsentStatus, 
  saveSettingsToLocalStorage, 
  loadSettingsFromLocalStorage,
  getPendingRecordingSessions,
  deleteRecordingSession,
  getAllTracksFromDB,
  saveTrackToDB,
  saveTrackMetadataToDB,
  deleteTrackFromDB,
  clearTracksFromDB
} from '../utils/storage';
import { projectBackupSchema } from '../utils/projectSchema';

interface UseProjectStorageProps {
  tracks: PodcastTrack[];
  setTracks: React.Dispatch<React.SetStateAction<PodcastTrack[]>>;
  
  // Script and Settings state updaters
  podcastName: string;
  setPodcastName: (val: string) => void;
  participants: string;
  setParticipants: (val: string) => void;
  scriptContent: string;
  setScriptContent: (val: string) => void;
  scriptMode: 'text' | 'cards';
  setScriptMode: (val: 'text' | 'cards') => void;
  scriptCards: ScriptCard[];
  setScriptCards: (val: ScriptCard[]) => void;
  activeCardIndex: number;
  setActiveCardIndex: (val: number) => void;

  // AI Helper settings state updaters
  aiStudentNotes: string;
  setAiStudentNotes: (val: string) => void;
  aiStructure: string;
  setAiStructure: (val: string) => void;
  aiOutputFormat: string;
  setAiOutputFormat: (val: string) => void;
  aiDuration: string;
  setAiDuration: (val: string) => void;
  aiArchetype: string;
  setAiArchetype: (val: string) => void;

  // Utilities for audio processing
  decodeFileToBuffer: (blob: Blob) => Promise<AudioBuffer>;
  generateWaveformPeaks: (blob: Blob) => Promise<number[]>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  stopIndividualTrack: () => void;

  // Merged preview clear helper
  clearMergedPreview: () => void;
}

export function useProjectStorage({
  tracks,
  setTracks,
  podcastName,
  setPodcastName,
  participants,
  setParticipants,
  scriptContent,
  setScriptContent,
  scriptMode,
  setScriptMode,
  scriptCards,
  setScriptCards,
  activeCardIndex,
  setActiveCardIndex,
  aiStudentNotes,
  setAiStudentNotes,
  aiStructure,
  setAiStructure,
  aiOutputFormat,
  setAiOutputFormat,
  aiDuration,
  setAiDuration,
  aiArchetype,
  setAiArchetype,
  decodeFileToBuffer,
  generateWaveformPeaks,
  setErrorMsg,
  setSuccessMsg,
  stopIndividualTrack,
  clearMergedPreview
}: UseProjectStorageProps) {
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [isConsentAccepted, setIsConsentAccepted] = useState<boolean>(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: number; quotaMb: number; pct: number } | null>(null);
  const [pendingSessions, setPendingSessions] = useState<any[]>([]);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Load saved settings and tracks on initial load if consent is accepted
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
      const sessions = await getPendingRecordingSessions();
      if (sessions && sessions.length > 0) {
        setPendingSessions(sessions);
      }

      // Fetch storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usedMb = est.usage ? Math.round(est.usage / (1024 * 1024)) : 0;
        const quotaMb = est.quota ? Math.round(est.quota / (1024 * 1024)) : 0;
        const pct = quotaMb > 0 ? Math.round((usedMb / quotaMb) * 100) : 0;
        setStorageEstimate({ usedMb, quotaMb, pct });
      }

      // Request persistent storage permission to protect classroom records from eviction
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        if (persisted) {
          console.log("Storage is persisted and will not be automatically evicted.");
        } else {
          console.log("Storage is best-effort and can be evicted under disk pressure.");
        }
      }

      const storedTracks = await getAllTracksFromDB();
      if (storedTracks && storedTracks.length > 0) {
        const decodedTracks: PodcastTrack[] = [];
        for (const st of storedTracks) {
          decodedTracks.push({
            id: st.id,
            name: st.name,
            blob: st.blob,
            audioUrl: URL.createObjectURL(st.blob),
            duration: st.duration,
            trimStart: st.trimStart,
            trimEnd: st.trimEnd,
            volume: st.volume,
            isEffect: st.isEffect,
            mimeType: st.mimeType,
            recordedAt: st.recordedAt,
            sizeBytes: st.sizeBytes,
            peaks: st.peaks,
            fadeInDuration: st.fadeInDuration || 0,
            fadeOutDuration: st.fadeOutDuration || 0,
            silenceAfter: st.silenceAfter || 0
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
              if (!track.peaks || track.peaks.length === 0) {
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

  useEffect(() => {
    const hasConsented = getConsentStatus();
    if (!hasConsented) {
      setShowConsentModal(true);
    } else {
      setIsConsentAccepted(true);
      loadSavedData();
    }
  }, []);

  const handleAcceptConsent = () => {
    try {
      localStorage.setItem('smbk_storage_consent_accepted', 'true');
    } catch (e) {
      console.error(e);
    }
    setIsConsentAccepted(true);
    setShowConsentModal(false);
    loadSavedData();
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

  // Crash Recovery
  const recoverSession = async (session: any) => {
    setIsRecovering(true);
    try {
      const RECORDING_MIME_CANDIDATES = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/webm',
      ];
      // Choose supported mimeType
      let mimeType = 'audio/webm';
      for (const candidate of RECORDING_MIME_CANDIDATES) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      // Merge chunks into a single Blob
      const combinedBlob = new Blob(session.chunks, { type: mimeType });
      
      // Decode combined Blob to get duration and generate peaks
      const decodedBuffer = await decodeFileToBuffer(combinedBlob);
      const duration = decodedBuffer.duration;
      const peaks = await generateWaveformPeaks(combinedBlob);

      const recoveredTrack: PodcastTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: `${session.name} (שוחזר לאחר קריסה)`,
        blob: combinedBlob,
        audioUrl: URL.createObjectURL(combinedBlob),
        duration: duration,
        trimStart: 0,
        trimEnd: duration,
        volume: 1.0,
        mimeType,
        sizeBytes: combinedBlob.size,
        recordedAt: new Date(session.lastUpdated).toISOString(),
        peaks
      };

      setTracks((prev) => [...prev, recoveredTrack]);
      await deleteRecordingSession(session.id);
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
      await deleteRecordingSession(sessionId);
      setPendingSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccessMsg('ההקלטה הבלתי-גמורה נמחקה בהצלחה.');
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

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
        mimeType: t.blob.type,
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
          audioFolder.file(`${track.id}`, track.blob);
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
          silenceAfter: trackMeta.silenceAfter || 0,
          recordedAt: new Date().toISOString(),
          sizeBytes: typedBlob.size,
          peaks: await generateWaveformPeaks(typedBlob)
        });
      }

      // 3. Clear existing URLs to prevent memory leaks
      tracks.forEach((t) => URL.revokeObjectURL(t.audioUrl));
      clearMergedPreview();
      stopIndividualTrack();

      // Wipe database
      await clearTracksFromDB();

      // Write newly imported tracks to DB
      for (const track of importedTracks) {
        await saveTrackToDB({
          id: track.id,
          name: track.name,
          blob: track.blob,
          duration: track.duration,
          trimStart: track.trimStart,
          trimEnd: track.trimEnd,
          volume: track.volume,
          isEffect: track.isEffect || false,
          mimeType: track.mimeType,
          recordedAt: track.recordedAt,
          sizeBytes: track.sizeBytes,
          peaks: track.peaks,
          fadeInDuration: track.fadeInDuration || 0,
          fadeOutDuration: track.fadeOutDuration || 0,
          silenceAfter: track.silenceAfter || 0
        });
      }

      // Re-apply states
      setPodcastName(metadata.podcastName || "");
      setParticipants(metadata.participants || "");
      setScriptContent(metadata.scriptContent || "");
      setScriptMode(metadata.scriptMode || "text");
      setScriptCards(metadata.scriptCards || []);
      setActiveCardIndex(metadata.activeCardIndex || 0);
      setAiStudentNotes(metadata.aiStudentNotes || "");
      setAiStructure(metadata.aiStructure || "שיחה בין שני אנשים");
      setAiOutputFormat(metadata.aiOutputFormat || "תסריט מלא");
      setAiDuration(metadata.aiDuration || "3 דקות");
      setAiArchetype(metadata.aiArchetype || "בית מדרש");

      setTracks(importedTracks);
      setSuccessMsg('🏆 הפרויקט שוחזר בהצלחה מקובץ גיבוי ZIP! כל הרצועות והתסריט נטענו מחדש.');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`כשל בטעינת קובץ גיבוי ZIP: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    showConsentModal,
    setShowConsentModal,
    isConsentAccepted,
    handleAcceptConsent,
    storageEstimate,
    pendingSessions,
    isRecovering,
    recoverSession,
    discardSession,
    exportProjectToZip,
    importProjectFromZip,
    isExporting,
    isImporting
  };
}
