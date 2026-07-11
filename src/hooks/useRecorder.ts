import { useState, useEffect, useRef } from 'react';
import { PodcastTrack } from '../types';
import { saveRecordingChunkToDB, finalizeRecordingSession, deleteRecordingSession } from '../utils/storage';

interface UseRecorderProps {
  tracks: PodcastTrack[];
  setTracks: React.Dispatch<React.SetStateAction<PodcastTrack[]>>;
  getAudioContext: () => AudioContext;
  decodeFileToBuffer: (blob: Blob) => Promise<AudioBuffer>;
  generateWaveformPeaks: (blob: Blob) => Promise<number[]>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export function useRecorder({
  tracks,
  setTracks,
  getAudioContext,
  decodeFileToBuffer,
  generateWaveformPeaks,
  setErrorMsg,
  setSuccessMsg
}: UseRecorderProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // Web Audio Context & Analyser
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micCanvasRef = useRef<HTMLCanvasElement>(null);

  const recordingSessionIdRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

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
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
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

  const startRecording = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    audioChunksRef.current = [];

    const RECORDING_MIME_CANDIDATES = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/webm',
    ];

    try {
      // Explicitly configure noise suppression, echo cancellation and auto gain control for high fidelity and podcast speed
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      recordingStreamRef.current = stream;

      const audioCtx = getAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // smaller size for snappy level bar
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      // Choose supported mimeType
      let mimeType = '';
      for (const candidate of RECORDING_MIME_CANDIDATES) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const recordingSessionId = `rec-session-${Date.now()}`;
      recordingSessionIdRef.current = recordingSessionId;
      recordingStartTimeRef.current = Date.now();

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const trackName = `הקלטה מהמיקרופון - טייק ${tracks.filter((t) => t.name.includes('הקלטה')).length + 1}`;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          try {
            await saveRecordingChunkToDB(recordingSessionId, trackName, event.data);
          } catch (err) {
            console.error("Failed to auto-save recording chunk:", err);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        const actualMime = mediaRecorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: actualMime });
        
        try {
          // Decode Blob to get duration and generate peaks
          const decodedBuffer = await decodeFileToBuffer(finalBlob);
          const duration = decodedBuffer.duration;
          const peaks = await generateWaveformPeaks(finalBlob);

          const newTrack: PodcastTrack = {
            id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: trackName,
            blob: finalBlob,
            audioUrl: URL.createObjectURL(finalBlob),
            duration: duration,
            trimStart: 0,
            trimEnd: duration,
            volume: 1.0,
            mimeType: actualMime,
            sizeBytes: finalBlob.size,
            recordedAt: new Date().toISOString(),
            peaks: peaks
          };

          setTracks((prev) => [...prev, newTrack]);
          setSuccessMsg('ההקלטה נשמרה בהצלחה והתווספה לרשימת הרצועות!');

          if (recordingSessionIdRef.current) {
            await finalizeRecordingSession(recordingSessionIdRef.current);
            await deleteRecordingSession(recordingSessionIdRef.current);
          }
        } catch (err: any) {
          console.error(err);
          setErrorMsg('שגיאה בפענוח נתוני השמע שהוקלטו.');
        }

        // Clean up recording stream
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
        }
        recordingSessionIdRef.current = null;
      };

      // Start continuous recording (no timeslices) to prevent audio jitter and guarantee continuous WebKit/Chrome file format framing
      mediaRecorder.start();
      setIsRecording(true);

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Handle Recording Timer and warning messages
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

  // Clean up canvas animations
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    recordingSeconds,
    micCanvasRef,
    startRecording,
    stopRecording
  };
}
