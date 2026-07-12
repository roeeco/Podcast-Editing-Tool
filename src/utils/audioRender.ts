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

  // Gentle dynamics compressor at the end to act as a polished master limiter
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-12, 0); // start compression at -12dB
  compressor.knee.setValueAtTime(12, 0);       // soft knee
  compressor.ratio.setValueAtTime(1.5, 0);     // very gentle ratio (1.5:1)
  compressor.attack.setValueAtTime(0.003, 0);  // 3ms attack
  compressor.release.setValueAtTime(0.25, 0);  // 250ms release for natural decay
  compressor.connect(offlineCtx.destination);

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
    trackGain.connect(compressor);
    source.connect(trackGain);

    // Fade-in calculations
    const fadeInTime = track.fadeInDuration || (options.useCrossfade && i > 0 ? crossfadeDuration : 0);
    // Fade-out calculations
    const fadeOutTime = track.fadeOutDuration || (options.useCrossfade && i < layout.length - 1 ? crossfadeDuration : 0);

    const steadyStart = startTime + fadeInTime;
    const steadyEnd = endTime - fadeOutTime;

    // Automate baseline track volume
    trackGain.gain.setValueAtTime(0, startTime);

    // Apply Fade-In
    if (fadeInTime > 0) {
      trackGain.gain.linearRampToValueAtTime(track.volume, steadyStart);
    } else {
      trackGain.gain.setValueAtTime(track.volume, startTime);
    }

    // Apply Ducking if enabled and it's an effect track
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
        .filter((d) => d.start < d.end);

      // Automate ducking (25% volume)
      for (const duck of mergedDucksFiltered) {
        const rampDownStart = duck.start;
        const rampDownEnd = Math.min(duck.end, duck.start + 0.3);
        const rampUpStart = Math.max(rampDownEnd, duck.end);
        const rampUpEnd = rampUpStart + 0.3;

        trackGain.gain.setValueAtTime(track.volume, rampDownStart);
        trackGain.gain.linearRampToValueAtTime(track.volume * 0.25, rampDownEnd);

        trackGain.gain.setValueAtTime(track.volume * 0.25, rampUpStart);
        trackGain.gain.linearRampToValueAtTime(track.volume, rampUpEnd);
      }
    }

    // Apply Fade-Out
    if (fadeOutTime > 0 && steadyEnd > steadyStart) {
      trackGain.gain.setValueAtTime(track.volume, steadyEnd);
      trackGain.gain.linearRampToValueAtTime(0, endTime);
    } else {
      trackGain.gain.setValueAtTime(track.volume, endTime);
    }

    // Start playback
    source.start(startTime, track.trimStart, trimDuration);
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
