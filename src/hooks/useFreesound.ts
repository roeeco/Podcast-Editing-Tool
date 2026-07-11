import { useState, useEffect } from 'react';
import { PodcastTrack } from '../types';

interface UseFreesoundProps {
  setTracks: React.Dispatch<React.SetStateAction<PodcastTrack[]>>;
  setIsUploading: (val: boolean) => void;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  decodeFileToBuffer: (blob: Blob) => Promise<AudioBuffer>;
  generateWaveformPeaks: (blob: Blob) => Promise<number[]>;
}

export function useFreesound({
  setTracks,
  setIsUploading,
  setErrorMsg,
  setSuccessMsg,
  decodeFileToBuffer,
  generateWaveformPeaks
}: UseFreesoundProps) {
  const [isFreesoundModalOpen, setIsFreesoundModalOpen] = useState<boolean>(false);
  const [freesoundCategory, setFreesoundCategory] = useState<'intro' | 'transition' | 'outro'>('intro');
  const [freesoundResults, setFreesoundResults] = useState<any[]>([]);
  const [freesoundLoading, setFreesoundLoading] = useState<boolean>(false);
  const [freesoundSearchQuery, setFreesoundSearchQuery] = useState<string>("");
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const fetchFreesoundAssets = async (category: 'intro' | 'transition' | 'outro', customQuery?: string) => {
    setFreesoundLoading(true);
    setErrorMsg(null);
    try {
      let query = customQuery;
      if (!query) {
        if (category === 'intro') {
          query = 'podcast intro music';
        } else if (category === 'transition') {
          query = 'podcast transition effect';
        } else {
          query = 'podcast closing music';
        }
      }

      const response = await fetch(`/api/freesound?type=${category === 'transition' ? 'soundeffects' : 'music'}&q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch from proxy, status: ${response.status}`);
      }
      const data = await response.json();
      setFreesoundResults(data.results || []);
    } catch (error: any) {
      console.error('Error loading Freesound assets:', error);
      setErrorMsg('שגיאה בטעינת קטעי שמע מ-Freesound. אנא נסה שוב.');
    } finally {
      setFreesoundLoading(false);
    }
  };

  useEffect(() => {
    if (isFreesoundModalOpen) {
      fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery);
    }
  }, [isFreesoundModalOpen, freesoundCategory]);

  useEffect(() => {
    if (!isFreesoundModalOpen) {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
        setPreviewAudio(null);
      }
      setPreviewPlayingId(null);
      setFreesoundSearchQuery("");
    }
  }, [isFreesoundModalOpen]);

  const togglePreviewAudio = (hitId: string, audioUrl: string) => {
    if (previewPlayingId === hitId && previewAudio) {
      previewAudio.pause();
      setPreviewPlayingId(null);
    } else {
      if (previewAudio) {
        previewAudio.pause();
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

  const handleAddFreesoundTrack = async (hit: any) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setPreviewAudio(null);
    }
    setPreviewPlayingId(null);

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const categoryHebrew = freesoundCategory === 'intro' ? 'פתיח' : freesoundCategory === 'transition' ? 'מעברון' : 'סגיר';
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

      const newTrack: PodcastTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: trackName,
        blob: audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        duration: duration,
        trimStart: 0,
        trimEnd: duration,
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

  return {
    isFreesoundModalOpen,
    setIsFreesoundModalOpen,
    freesoundCategory,
    setFreesoundCategory,
    freesoundResults,
    freesoundLoading,
    freesoundSearchQuery,
    setFreesoundSearchQuery,
    previewPlayingId,
    togglePreviewAudio,
    handleAddFreesoundTrack,
    fetchFreesoundAssets
  };
}
