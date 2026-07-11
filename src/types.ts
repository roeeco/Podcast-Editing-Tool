export interface PodcastTrack {
  id: string;
  name: string;
  blob?: Blob; // optional for corrupt/missing audio
  audioUrl?: string; // Object URL for standard preview
  audioBuffer?: AudioBuffer; // Decoded buffer for Web Audio API operations (lazy decoded)
  duration: number; // in seconds
  trimStart: number; // start trimming time (seconds)
  trimEnd: number; // end trimming time (seconds)
  volume: number; // track volume, e.g. 0 to 1
  isEffect?: boolean; // indicates if the track is a sound effect/music
  mimeType?: string;
  recordedAt?: string;
  sizeBytes?: number;
  peaks?: number[]; // Cached peak levels for robust waveform visualization
  fadeInDuration?: number; // in seconds (0 to 10)
  fadeOutDuration?: number; // in seconds (0 to 10)
  silenceAfter?: number; // in seconds (0 to 10)
  sourceSessionId?: string;
  isMissingAudio?: boolean;
}

export interface RecordingSession {
  id: string;
  projectId?: string;
  name: string;
  mimeType: string;          // exact mediaRecorder.mimeType
  startedAt: number;
  lastChunkAt: number;
  chunkCount: number;
  active: boolean;
  finalizedTrackId?: string;
  finalizedAt?: number;
}

export interface RecordingChunk {
  id: string;                // `${sessionId}-${index}`
  sessionId: string;
  index: number;
  blob: Blob;
  sizeBytes: number;
  createdAt: number;
}

export interface TrackAudioRecord {
  id: string;                // trackId or audioBlobId
  blob: Blob;                // finalized playable Blob only
}

export interface ScriptSuggestion {
  id: string;
  title: string;
  content: string;
  cards: { type: 'intro' | 'body' | 'outro'; text: string }[];
}

export interface ScriptCard {
  id: string;
  type: 'intro' | 'body' | 'outro';
  text: string;
}
