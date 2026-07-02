export interface PodcastTrack {
  id: string;
  name: string;
  blob: Blob;
  audioUrl: string; // Object URL for standard preview
  audioBuffer: AudioBuffer; // Decoded buffer for Web Audio API operations
  duration: number; // in seconds
  trimStart: number; // start trimming time (seconds)
  trimEnd: number; // end trimming time (seconds)
  volume: number; // track volume, e.g. 0 to 1
  isEffect?: boolean; // indicates if the track is a sound effect/music
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
