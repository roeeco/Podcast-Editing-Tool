import { useState, useEffect, useRef } from 'react';
import { PodcastTrack } from '../types';

interface UseAudioMergeProps {
  tracks: PodcastTrack[];
  getAudioContext: () => AudioContext;
  decodeFileToBuffer: (blob: Blob) => Promise<AudioBuffer>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  stopIndividualTrack: () => void;
}

export function useAudioMerge({
  tracks,
  getAudioContext,
  decodeFileToBuffer,
  setErrorMsg,
  setSuccessMsg,
  stopIndividualTrack
}: UseAudioMergeProps) {
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [hasUnmergedChanges, setHasUnmergedChanges] = useState<boolean>(true);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedDuration, setMergedDuration] = useState<number>(0);
  const [isMergedPlayerPlaying, setIsMergedPlayerPlaying] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressProgress, setCompressProgress] = useState<number>(0);

  // Configuration options
  const [useCrossfade, setUseCrossfade] = useState<boolean>(true);
  const [useNormalization, setUseNormalization] = useState<boolean>(true);
  const [useDucking, setUseDucking] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<'wav' | 'webm'>('wav');

  const mergedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Mark unmerged changes whenever tracks modify
  useEffect(() => {
    setHasUnmergedChanges(true);
  }, [tracks]);

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
      }
    };
  }, [mergedUrl]);

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
          audioBitsPerSecond: 128000 
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

  // Web Audio API Merging and WAV/WebM Compilation
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
      mergedAudioRef.current.pause();
      setIsMergedPlayerPlaying(false);
    }

    try {
      const audioCtx = getAudioContext();

      // Filter valid tracks and calculate duration
      const tracksToMerge = tracks.map((track) => {
        const trimDuration = track.trimEnd - track.trimStart;
        return {
          ...track,
          trimDuration: Math.max(0, trimDuration)
        };
      }).filter(t => t.trimDuration > 0);

      if (tracksToMerge.length === 0) {
        throw new Error('אורך כל הרצועות שנבחרו למיזוג הוא 0 שניות.');
      }

      // Use standard sample rate (e.g. 44100 Hz)
      const sampleRate = 44100;
      const channels = 2; // Stereo output
      const crossfadeDuration = 1.5; // 1.5s crossfade overlap

      // Decode any tracks that haven't been decoded yet (lazy decoding on demand)
      const decodedBuffers = new Map<string, AudioBuffer>();
      for (const track of tracksToMerge) {
        let buffer = track.audioBuffer;
        if (!buffer) {
          buffer = await decodeFileToBuffer(track.blob);
        }
        decodedBuffers.set(track.id, buffer);
      }

      // Calculate global layout positions (start/end sample) for all tracks
      const layout: {
        track: typeof tracksToMerge[0];
        startSample: number;
        endSample: number;
      }[] = [];

      let currentSample = 0;
      for (let i = 0; i < tracksToMerge.length; i++) {
        const track = tracksToMerge[i];
        const trackSamples = Math.ceil(track.trimDuration * sampleRate);
        
        let startSample = currentSample;
        
        // If crossfade is enabled, overlap this track with the previous one
        if (i > 0 && useCrossfade) {
          const prevLayout = layout[i - 1];
          const prevDuration = prevLayout.track.trimDuration;
          if (prevDuration > 3 && track.trimDuration > 3) {
            const crossSamples = Math.floor(crossfadeDuration * sampleRate);
            startSample = Math.max(0, prevLayout.endSample - crossSamples);
          }
        }

        const endSample = startSample + trackSamples;
        layout.push({
          track,
          startSample,
          endSample
        });

        // The next track starts after this one finishes, plus any silence spacer duration
        const silenceSamples = Math.ceil((track.silenceAfter || 0) * sampleRate);
        currentSample = endSample + silenceSamples;
      }

      // Total output buffer samples
      const totalBufferSamples = Math.max(
        currentSample,
        ...layout.map(l => l.endSample)
      );

      const totalSeconds = totalBufferSamples / sampleRate;

      // Create empty target buffer
      const mergedBuffer = audioCtx.createBuffer(
        channels,
        totalBufferSamples,
        sampleRate
      );

      // Build speech/voice tracks active interval mapping for automatic background music ducking
      // Speech tracks are those not marked as isEffect (sound effects/music)
      const speechIntervals = layout
        .filter(item => !item.track.isEffect)
        .map(item => [item.startSample, item.endSample]);

      // Iterate over left and right channels to mix sample data
      for (let channelIndex = 0; channelIndex < channels; channelIndex++) {
        const targetData = mergedBuffer.getChannelData(channelIndex);
        targetData.fill(0); // initialize channel with zeros

        for (const item of layout) {
          const { track, startSample, endSample } = item;
          const buffer = decodedBuffers.get(track.id)!;
          const trackChannels = buffer.numberOfChannels;
          
          // Fallback if track has fewer channels than target (e.g. Mono -> Stereo)
          const sourceChannelIndex = channelIndex < trackChannels ? channelIndex : 0;
          const sourceData = buffer.getChannelData(sourceChannelIndex);

          // Calculate start and end samples in source buffer for the trim range
          const startSourceSample = Math.floor(track.trimStart * buffer.sampleRate);
          const rateRatio = buffer.sampleRate / sampleRate;
          const trackSamplesCount = endSample - startSample;

          const fadeInSamples = (track.fadeInDuration || 0) * sampleRate;
          const fadeOutSamples = (track.fadeOutDuration || 0) * sampleRate;

          for (let i = 0; i < trackSamplesCount; i++) {
            const targetSamplePos = startSample + i;
            if (targetSamplePos >= targetData.length) break;

            const sourceSamplePos = startSourceSample + Math.floor(i * rateRatio);
            if (sourceSamplePos < sourceData.length) {
              let sampleVal = sourceData[sourceSamplePos] * track.volume;

              // Apply Fade In
              if (fadeInSamples > 0 && i < fadeInSamples) {
                const ratio = i / fadeInSamples;
                sampleVal *= ratio;
              }
              // Apply Fade Out
              else if (fadeOutSamples > 0 && i > trackSamplesCount - fadeOutSamples) {
                const ratio = (trackSamplesCount - i) / fadeOutSamples;
                sampleVal *= Math.max(0, ratio);
              }

              // Apply default crossfade transition ramp if track fades aren't configured
              if (useCrossfade && i < (crossfadeDuration * sampleRate) && item.track !== tracksToMerge[0]) {
                const crossSamples = crossfadeDuration * sampleRate;
                if (!track.fadeInDuration) {
                  sampleVal *= (i / crossSamples);
                }
              }

              // Apply Automatic Background Music Ducking under dialogue/speech
              if (useDucking && track.isEffect) {
                const isOverlappingSpeech = speechIntervals.some(([speechStart, speechEnd]) => {
                  const padding = 0.5 * sampleRate; // 0.5 seconds padding around speech
                  return targetSamplePos >= (speechStart - padding) && targetSamplePos <= (speechEnd + padding);
                });

                if (isOverlappingSpeech) {
                  sampleVal *= 0.25; // Duck volume to 25%
                }
              }

              // Mix by addition (additive mixing)
              targetData[targetSamplePos] += sampleVal;
            }
          }
        }
      }

      // Apply Peak Normalization to maximize audio volume and level speech without clipping
      if (useNormalization) {
        let maxVal = 0;
        for (let c = 0; c < channels; c++) {
          const data = mergedBuffer.getChannelData(c);
          for (let i = 0; i < data.length; i++) {
            const absVal = Math.abs(data[i]);
            if (absVal > maxVal) {
              maxVal = absVal;
            }
          }
        }

        if (maxVal > 0) {
          const targetPeak = 0.98; // Peak level at -0.2 dB
          const normFactor = targetPeak / maxVal;
          for (let c = 0; c < channels; c++) {
            const data = mergedBuffer.getChannelData(c);
            for (let i = 0; i < data.length; i++) {
              data[i] *= normFactor;
            }
          }
        }
      }

      // Encode the finished AudioBuffer into a WAV blob client-side
      let finalBlob = bufferToWav(mergedBuffer);
      
      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
      }

      let downloadableUrl = URL.createObjectURL(finalBlob);

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

  const toggleMergedAudio = () => {
    if (!mergedUrl) return;

    if (isMergedPlayerPlaying && mergedAudioRef.current) {
      mergedAudioRef.current.pause();
      setIsMergedPlayerPlaying(false);
    } else {
      if (mergedAudioRef.current) {
        mergedAudioRef.current.pause();
      }
      const audio = new Audio(mergedUrl);
      audio.play().catch(e => console.error("Error playing merged audio:", e));
      audio.onended = () => {
        setIsMergedPlayerPlaying(false);
      };
      mergedAudioRef.current = audio;
      setIsMergedPlayerPlaying(true);
    }
  };

  return {
    isMerging,
    hasUnmergedChanges,
    setHasUnmergedChanges,
    mergedBlob,
    setMergedBlob,
    mergedUrl,
    setMergedUrl,
    mergedDuration,
    isMergedPlayerPlaying,
    setIsMergedPlayerPlaying,
    isCompressing,
    compressProgress,
    useCrossfade,
    setUseCrossfade,
    useNormalization,
    setUseNormalization,
    useDucking,
    setUseDucking,
    exportFormat,
    setExportFormat,
    mergePodcastTracks,
    toggleMergedAudio,
    mergedAudioRef
  };
}
