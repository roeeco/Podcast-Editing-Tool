import { PodcastTrack } from '../types';

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

  // Calculate timelines / layout
  const layout: {
    track: typeof tracksToMerge[0];
    startTime: number;
    endTime: number;
    trimDuration: number;
  }[] = [];

  let currentTime = 0;
  for (let i = 0; i < tracksToMerge.length; i++) {
    const track = tracksToMerge[i];
    const trimDuration = track.trimDuration;

    let startTime = currentTime;

    // If crossfade is enabled, overlap this track with the previous one
    if (options.useCrossfade && i > 0) {
      const prevLayout = layout[i - 1];
      if (prevLayout.trimDuration > 3 && trimDuration > 3) {
        startTime = Math.max(0, prevLayout.endTime - crossfadeDuration);
      }
    }

    const endTime = startTime + trimDuration;
    layout.push({
      track,
      startTime,
      endTime,
      trimDuration
    });

    // Next track starts after this one, plus silence spacer
    currentTime = endTime + (track.silenceAfter || 0);
  }

  const totalDuration = currentTime;
  const totalSamples = Math.ceil(totalDuration * sampleRate) || 1;

  // Initialize OfflineAudioContext for rendering
  const offlineCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

  // Transparent mix bus
  const mixBus = offlineCtx.createGain();
  mixBus.gain.setValueAtTime(1, 0);
  mixBus.connect(offlineCtx.destination);

  // Gather speech intervals for automatic ducking
  const speechIntervals = layout
    .filter((item) => !item.track.isEffect)
    .map((item) => ({ start: item.startTime, end: item.endTime }));

  // Create nodes, automate gain, and start sources
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    const { track, startTime, endTime, trimDuration } = item;
    const buffer = decodedBuffers.get(track.id);

    if (!buffer) continue;

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const trackGain = offlineCtx.createGain();
    trackGain.connect(mixBus);
    source.connect(trackGain);

    // Fade-in calculations
    const fadeInTime = track.fadeInDuration || (options.useCrossfade && i > 0 ? crossfadeDuration : 0);
    // Fade-out calculations
    const fadeOutTime = track.fadeOutDuration || (options.useCrossfade && i < layout.length - 1 ? crossfadeDuration : 0);

    const steadyStart = startTime + fadeInTime;
    const steadyEnd = endTime - fadeOutTime;

    // Collect gain keyframes chronologically to prevent conflicting transitions or jumps
    const keyframes: { time: number; value: number }[] = [];

    // 1. Initial zero volume at start
    keyframes.push({ time: startTime, value: 0 });

    // 2. Fade in transition
    if (fadeInTime > 0) {
      keyframes.push({ time: steadyStart, value: track.volume });
    } else {
      keyframes.push({ time: startTime + 0.001, value: track.volume });
    }

    // 3. Ducking events (if applicable)
    if (options.useDucking && track.isEffect && speechIntervals.length > 0) {
      // Find speech overlaps
      const duckIntervals: { start: number; end: number }[] = [];
      for (const speech of speechIntervals) {
        const padStart = speech.start - 0.5;
        const padEnd = speech.end + 0.5;

        const overlapStart = Math.max(startTime, padStart);
        const overlapEnd = Math.min(endTime, padEnd);

        if (overlapStart < overlapEnd) {
          duckIntervals.push({ start: overlapStart, end: overlapEnd });
        }
      }

      // Merge overlapping duck intervals
      duckIntervals.sort((a, b) => a.start - b.start);
      const mergedDucks: { start: number; end: number }[] = [];
      for (const interval of duckIntervals) {
        if (mergedDucks.length === 0) {
          mergedDucks.push(interval);
        } else {
          const last = mergedDucks[mergedDucks.length - 1];
          if (interval.start <= last.end) {
            last.end = Math.max(last.end, interval.end);
          } else {
            mergedDucks.push(interval);
          }
        }
      }

      // Restrict duck intervals to the steady volume section to avoid clashes with fades
      const mergedDucksFiltered = mergedDucks
        .map((d) => ({
          start: Math.max(steadyStart, d.start),
          end: Math.min(steadyEnd, d.end)
        }))
        .filter((d) => d.start + 0.1 < d.end);

      // Generate duck keyframes using gentle 0.25s linear ramps to prevent audio clicks
      for (const duck of mergedDucksFiltered) {
        const rampDuration = 0.25;
        const rampDownStart = duck.start;
        const rampDownEnd = Math.min(duck.end, duck.start + rampDuration);
        const rampUpStart = Math.max(rampDownEnd, duck.end - rampDuration);
        const rampUpEnd = duck.end;

        keyframes.push({ time: rampDownStart, value: track.volume });
        keyframes.push({ time: rampDownEnd, value: track.volume * 0.25 });
        keyframes.push({ time: rampUpStart, value: track.volume * 0.25 });
        keyframes.push({ time: rampUpEnd, value: track.volume });
      }
    }

    // 4. Fade out transition
    if (fadeOutTime > 0 && steadyEnd > steadyStart) {
      keyframes.push({ time: steadyEnd, value: track.volume });
      keyframes.push({ time: endTime, value: 0 });
    } else {
      keyframes.push({ time: endTime - 0.001, value: track.volume });
      keyframes.push({ time: endTime, value: 0 });
    }

    // 5. Apply the keyframes to the AudioParam chronologically
    keyframes.sort((a, b) => a.time - b.time);

    const cleanKeyframes: { time: number; value: number }[] = [];
    let lastTime = -1;
    for (const k of keyframes) {
      const clampedTime = Math.max(startTime, Math.min(endTime, k.time));
      // Ensure strictly increasing times for reliable Web Audio API scheduling
      if (clampedTime > lastTime + 0.0001) {
        cleanKeyframes.push({ time: clampedTime, value: k.value });
        lastTime = clampedTime;
      }
    }

    if (cleanKeyframes.length > 0) {
      trackGain.gain.setValueAtTime(cleanKeyframes[0].value, cleanKeyframes[0].time);
      for (let kIdx = 1; kIdx < cleanKeyframes.length; kIdx++) {
        trackGain.gain.linearRampToValueAtTime(cleanKeyframes[kIdx].value, cleanKeyframes[kIdx].time);
      }
    }

    // Start playback
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
