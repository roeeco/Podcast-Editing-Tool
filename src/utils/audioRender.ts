import { PodcastTrack } from '../types';

const DUCK_LEVEL = 0.25;
const DUCK_ATTACK_SECONDS = 0.08;
const DUCK_RELEASE_SECONDS = 0.3;
const DUCK_INTERVAL_MERGE_GAP = 0.15;

export interface RenderOptions {
  useCrossfade: boolean;
  useDucking: boolean;
  useClipProtection: boolean;
  outputSampleRate?: number;
}

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtxClass();
  }
  return sharedAudioContext;
}

async function decodeBlobToBuffer(blob: Blob, audioCtx: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return new Promise<AudioBuffer>((resolve, reject) => {
    audioCtx.decodeAudioData(
      arrayBuffer,
      (buffer) => resolve(buffer),
      (err) => {
        console.error('Error decoding audio data in audioRender:', err);
        reject(err);
      }
    );
  });
}

export async function renderPodcastMix(
  tracks: PodcastTrack[],
  options: RenderOptions
): Promise<{ buffer: AudioBuffer; duration: number }> {
  const sampleRate = options.outputSampleRate || 48000;
  const channels = 2; // Stereo render output
  const crossfadeDuration = 1.5; // 1.5s crossfade overlap

  // Filter valid tracks
  const tracksToMerge = tracks
    .filter((track) => !track.isMissingAudio && (track.blob || track.isSilence))
    .map((track) => {
      const trimDuration = track.trimEnd - track.trimStart;
      return {
        ...track,
        trimDuration: Math.max(0, trimDuration)
      };
    })
    .filter((t) => t.trimDuration > 0);

  if (tracksToMerge.length === 0) {
    throw new Error('אורך כל הרצועות שנבחרו למיזוג הוא 0 שניות.');
  }

  const audioCtx = getSharedAudioContext();

  // Decode missing buffers sequentially or in parallel
  const decodedBuffers = new Map<string, AudioBuffer>();
  await Promise.all(
    tracksToMerge.map(async (track) => {
      if (track.audioBuffer) {
        decodedBuffers.set(track.id, track.audioBuffer);
      } else if (track.isSilence) {
        // Create silent AudioBuffer
        const silentBuffer = audioCtx.createBuffer(channels, Math.ceil(track.trimDuration * sampleRate), sampleRate);
        decodedBuffers.set(track.id, silentBuffer);
      } else if (track.blob) {
        const decoded = await decodeBlobToBuffer(track.blob, audioCtx);
        decodedBuffers.set(track.id, decoded);
      }
    })
  );

  // Calculate timelines / layout (Pass 1: foreground timeline)
  const layout: {
    track: typeof tracksToMerge[0];
    startTime: number;
    endTime: number;
    trimDuration: number;
    playbackMode: 'sequence' | 'background-once' | 'background-loop';
  }[] = [];

  let currentTime = 0;
  let lastSequentialLayout: typeof layout[0] | null = null;

  for (let i = 0; i < tracksToMerge.length; i++) {
    const track = tracksToMerge[i];
    const mode = track.playbackMode || 'sequence';
    const trimDuration = track.trimDuration;

    if (mode === 'sequence') {
      let startTime = currentTime;

      // If crossfade is enabled, overlap this track with the previous sequential track
      if (options.useCrossfade && lastSequentialLayout !== null) {
        if (lastSequentialLayout.trimDuration > 3 && trimDuration > 3) {
          startTime = Math.max(0, lastSequentialLayout.endTime - crossfadeDuration);
        }
      }

      const endTime = startTime + trimDuration;
      const currentLayout = {
        track,
        startTime,
        endTime,
        trimDuration,
        playbackMode: 'sequence' as const
      };
      layout.push(currentLayout);

      // Next track starts after this one, plus silence spacer
      currentTime = endTime + (track.silenceAfter || 0);
      lastSequentialLayout = currentLayout;
    } else {
      // For background tracks:
      // store their start time as the current foreground cursor
      const startTime = currentTime;
      layout.push({
        track,
        startTime,
        endTime: startTime + trimDuration, // temporary, will be adjusted in Pass 2
        trimDuration,
        playbackMode: mode as 'background-once' | 'background-loop'
      });
    }
  }

  // Pass 2: background timing
  const sequentialLayouts = layout.filter((item) => item.playbackMode === 'sequence');
  const foregroundEndTime = sequentialLayouts.length > 0
    ? Math.max(...sequentialLayouts.map((item) => item.endTime))
    : 0;

  const backgroundOnceLayouts = layout.filter((item) => item.playbackMode === 'background-once');
  const allBackgroundOnceEndTimes = backgroundOnceLayouts.map((item) => item.startTime + item.trimDuration);

  const projectEndTime = Math.max(
    foregroundEndTime,
    ...allBackgroundOnceEndTimes,
    0
  );

  for (const item of layout) {
    if (item.playbackMode === 'background-loop') {
      const loopStartTime = item.startTime;
      const loopEndTime = Math.max(projectEndTime, loopStartTime + item.trimDuration);
      item.endTime = loopEndTime;
    } else if (item.playbackMode === 'background-once') {
      item.endTime = item.startTime + item.trimDuration;
    }
  }

  const totalDuration = layout.length > 0
    ? Math.max(...layout.map((item) => item.endTime), 0)
    : 0;

  const totalSamples = Math.ceil(totalDuration * sampleRate) || 1;

  // Initialize OfflineAudioContext for rendering
  const offlineCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

  // Transparent mix bus
  const mixBus = offlineCtx.createGain();
  mixBus.gain.setValueAtTime(1, 0);
  mixBus.connect(offlineCtx.destination);

  // Gather audible sequential-track intervals for automatic ducking
  const audibleSequentialIntervals = layout
    .filter((item) => item.playbackMode === 'sequence' && !item.track.isSilence)
    .map((item) => ({ start: item.startTime, end: item.endTime }));

  // Create nodes, automate gain, and start sources
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    const { track, startTime, endTime, trimDuration } = item;
    const buffer = decodedBuffers.get(track.id);

    if (!buffer) continue;

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // Gain-node chain: source -> trackGain -> fadeGain -> duckGain -> mixBus
    const trackGain = offlineCtx.createGain();
    const fadeGain = offlineCtx.createGain();
    const duckGain = offlineCtx.createGain();

    source.connect(trackGain);
    trackGain.connect(fadeGain);
    fadeGain.connect(duckGain);
    duckGain.connect(mixBus);

    // 1. Static user volume/gain (never automated, completely separate)
    trackGain.gain.setValueAtTime(track.volume, 0);

    // 2. Fades: volume, fade-in, fade-out
    // For looping tracks: fade-in happens once at the beginning, fade-out happens once at the final endpoint
    let fadeInTime = 0;
    let fadeOutTime = 0;

    if (item.playbackMode === 'sequence') {
      const seqIdx = sequentialLayouts.findIndex((x) => x.track.id === track.id);
      fadeInTime = track.fadeInDuration || (options.useCrossfade && seqIdx > 0 ? crossfadeDuration : 0);
      fadeOutTime = track.fadeOutDuration || (options.useCrossfade && seqIdx < sequentialLayouts.length - 1 ? crossfadeDuration : 0);
    } else {
      // background tracks retain their configured: volume, fade-in, fade-out
      fadeInTime = track.fadeInDuration || 0;
      fadeOutTime = track.fadeOutDuration || 0;
    }

    const fadeKeyframes: { time: number; value: number }[] = [];
    const steadyStart = startTime + fadeInTime;
    const steadyEnd = endTime - fadeOutTime;

    // Initial value for fadeGain (0 if there's fade-in, otherwise 1)
    fadeKeyframes.push({ time: startTime, value: fadeInTime > 0 ? 0 : 1 });

    if (fadeInTime > 0) {
      fadeKeyframes.push({ time: steadyStart, value: 1 });
    }

    if (steadyEnd > steadyStart) {
      fadeKeyframes.push({ time: steadyEnd, value: 1 });
    }

    fadeKeyframes.push({ time: endTime, value: fadeOutTime > 0 ? 0 : 1 });

    fadeKeyframes.sort((a, b) => a.time - b.time);

    const cleanFadeKeyframes: { time: number; value: number }[] = [];
    let lastFadeTime = -1;
    for (const k of fadeKeyframes) {
      const clampedTime = Math.max(startTime, Math.min(endTime, k.time));
      if (clampedTime > lastFadeTime + 0.0001) {
        cleanFadeKeyframes.push({ time: clampedTime, value: k.value });
        lastFadeTime = clampedTime;
      }
    }

    if (cleanFadeKeyframes.length > 0) {
      fadeGain.gain.setValueAtTime(cleanFadeKeyframes[0].value, cleanFadeKeyframes[0].time);
      for (let kIdx = 1; kIdx < cleanFadeKeyframes.length; kIdx++) {
        fadeGain.gain.linearRampToValueAtTime(cleanFadeKeyframes[kIdx].value, cleanFadeKeyframes[kIdx].time);
      }
    } else {
      fadeGain.gain.setValueAtTime(1, 0);
    }

    // 3. Ducking (if options.useDucking is enabled)
    // duck only background-once and background-loop tracks
    // duck them only while they overlap audible sequential tracks
    // do not let background tracks duck each other
    const duckKeyframes: { time: number; value: number }[] = [];
    duckKeyframes.push({ time: startTime, value: 1.0 });

    if (
      options.useDucking &&
      (item.playbackMode === 'background-once' || item.playbackMode === 'background-loop') &&
      audibleSequentialIntervals.length > 0
    ) {
      // Calculate intersections between this background track's active interval and all audible sequential-track intervals
      const intersections: { start: number; end: number }[] = [];
      for (const seq of audibleSequentialIntervals) {
        const overlapStart = Math.max(startTime, seq.start);
        const overlapEnd = Math.min(endTime, seq.end);
        if (overlapStart < overlapEnd) {
          intersections.push({ start: overlapStart, end: overlapEnd });
        }
      }

      // Merge overlapping intervals or intervals separated by less than DUCK_INTERVAL_MERGE_GAP
      intersections.sort((a, b) => a.start - b.start);
      const mergedDucks: { start: number; end: number }[] = [];
      for (const interval of intersections) {
        if (mergedDucks.length === 0) {
          mergedDucks.push({ ...interval });
        } else {
          const last = mergedDucks[mergedDucks.length - 1];
          if (interval.start <= last.end + DUCK_INTERVAL_MERGE_GAP) {
            last.end = Math.max(last.end, interval.end);
          } else {
            mergedDucks.push({ ...interval });
          }
        }
      }

      // Generate ducking keyframes
      for (const interval of mergedDucks) {
        const rampDownStart = interval.start;
        const rampDownEnd = Math.min(endTime, interval.start + DUCK_ATTACK_SECONDS);
        const rampUpStart = Math.max(rampDownEnd, interval.end);
        const rampUpEnd = Math.min(endTime, interval.end + DUCK_RELEASE_SECONDS);

        duckKeyframes.push({ time: rampDownStart, value: 1.0 });
        duckKeyframes.push({ time: rampDownEnd, value: DUCK_LEVEL });
        duckKeyframes.push({ time: rampUpStart, value: DUCK_LEVEL });
        duckKeyframes.push({ time: rampUpEnd, value: 1.0 });
      }
    }

    duckKeyframes.push({ time: endTime, value: 1.0 });

    duckKeyframes.sort((a, b) => a.time - b.time);

    const cleanDuckKeyframes: { time: number; value: number }[] = [];
    let lastDuckTime = -1;
    for (const k of duckKeyframes) {
      const clampedTime = Math.max(startTime, Math.min(endTime, k.time));
      if (clampedTime > lastDuckTime + 0.0001) {
        cleanDuckKeyframes.push({ time: clampedTime, value: k.value });
        lastDuckTime = clampedTime;
      }
    }

    if (cleanDuckKeyframes.length > 0) {
      duckGain.gain.setValueAtTime(cleanDuckKeyframes[0].value, cleanDuckKeyframes[0].time);
      for (let kIdx = 1; kIdx < cleanDuckKeyframes.length; kIdx++) {
        duckGain.gain.linearRampToValueAtTime(cleanDuckKeyframes[kIdx].value, cleanDuckKeyframes[kIdx].time);
      }
    } else {
      duckGain.gain.setValueAtTime(1.0, 0);
    }

    // 4. Start playback source
    if (item.playbackMode === 'background-loop') {
      source.loop = true;
      source.loopStart = track.trimStart;
      source.loopEnd = track.trimEnd;
      source.start(startTime, track.trimStart);
      source.stop(endTime);
    } else {
      const sourceOffset = track.isSilence
        ? 0
        : Math.max(0, Math.min(track.trimStart, Math.max(0, buffer.duration - 0.001)));

      const safeDuration = track.isSilence
        ? trimDuration
        : Math.max(0, Math.min(trimDuration, buffer.duration - sourceOffset));

      if (safeDuration > 0) {
        source.start(startTime, sourceOffset, safeDuration);
      }
    }
  }

  // Render the audio graph asynchronously
  const renderedBuffer = await offlineCtx.startRendering();

  // Clip protection (only attenuate if peak exceeds 0.98)
  if (options.useClipProtection) {
    let maxPeak = 0;
    const numChannels = renderedBuffer.numberOfChannels;
    for (let c = 0; c < numChannels; c++) {
      const data = renderedBuffer.getChannelData(c);
      for (let j = 0; j < data.length; j++) {
        const absVal = Math.abs(data[j]);
        if (absVal > maxPeak) {
          maxPeak = absVal;
        }
      }
    }

    if (maxPeak > 0.98) {
      const attenuationFactor = 0.98 / maxPeak;
      for (let c = 0; c < numChannels; c++) {
        const data = renderedBuffer.getChannelData(c);
        for (let j = 0; j < data.length; j++) {
          data[j] *= attenuationFactor;
        }
      }
      console.log(`[Clip Protection] Attenuated mix by ${attenuationFactor} (Peak was ${maxPeak})`);
    }
  }

  return {
    buffer: renderedBuffer,
    duration: totalDuration
  };
}
