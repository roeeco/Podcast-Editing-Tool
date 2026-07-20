import { z } from 'zod';
import { RecordingSession, RecordingChunk, TrackPlaybackMode } from '../types';

const DB_NAME = 'SmbkPodDB';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audioData')) {
        db.createObjectStore('audioData', { keyPath: 'id' });
      }

      if (oldVersion < 3) {
        if (db.objectStoreNames.contains('recordingChunks')) {
          db.deleteObjectStore('recordingChunks');
        }
        const chunksStore = db.createObjectStore('recordingChunks', { keyPath: 'id' });
        chunksStore.createIndex('sessionId', 'sessionId', { unique: false });

        if (!db.objectStoreNames.contains('recordingSessions')) {
          db.createObjectStore('recordingSessions', { keyPath: 'id' });
        }
      } else {
        if (!db.objectStoreNames.contains('recordingSessions')) {
          db.createObjectStore('recordingSessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('recordingChunks')) {
          const chunksStore = db.createObjectStore('recordingChunks', { keyPath: 'id' });
          chunksStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      }

      // Migration from v1 to v2
      if (oldVersion < 2) {
        try {
          const transaction = request.transaction;
          if (transaction) {
            const tracksStore = transaction.objectStore('tracks');
            const audioStore = db.objectStoreNames.contains('audioData')
              ? transaction.objectStore('audioData')
              : db.createObjectStore('audioData', { keyPath: 'id' });

            const getAllReq = tracksStore.getAll();
            getAllReq.onsuccess = () => {
              const oldTracks = getAllReq.result || [];
              for (const track of oldTracks) {
                if (track.blob) {
                  audioStore.put({ id: track.id, blob: track.blob });
                  delete track.blob;
                  tracksStore.put(track);
                }
              }
            };
          }
        } catch (err) {
          console.error("Migration error inside upgrade transaction:", err);
        }
      }
    };
  });
}

export interface StoredTrack {
  id: string;
  name: string;
  blob?: Blob;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  isEffect?: boolean;
  mimeType?: string;
  recordedAt?: string;
  sizeBytes?: number;
  peaks?: number[];
  fadeInDuration?: number;
  fadeOutDuration?: number;
  silenceAfter?: number;
  sourceSessionId?: string;
  isMissingAudio?: boolean;
  playbackMode?: TrackPlaybackMode;
}

export async function saveTrackMetadataToDB(track: Omit<StoredTrack, 'blob'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const getReq = store.get(track.id);
    getReq.onsuccess = () => {
      const existing = getReq.result || {};
      const updated = { ...existing, ...track };
      delete (updated as any).blob;
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function saveTrackAudioToDB(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioData', 'readwrite');
    const store = tx.objectStore('audioData');
    const request = store.put({ id, blob });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrackToDB(track: StoredTrack): Promise<void> {
  const db = await openDB();
  const { blob, ...metadata } = track;

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audioData'], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    tx.objectStore('tracks').put(metadata);
    if (blob) {
      tx.objectStore('audioData').put({ id: track.id, blob });
    }
  });
}

export async function deleteTrackFromDB(id: string): Promise<void> {
  const db = await openDB();
  
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audioData', 'readwrite');
    const store = tx.objectStore('audioData');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearTracksFromDB(): Promise<void> {
  const db = await openDB();
  
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audioData', 'readwrite');
    const store = tx.objectStore('audioData');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readwrite');
    const store = tx.objectStore('recordingChunks');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readwrite');
    const store = tx.objectStore('recordingSessions');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTracksFromDB(): Promise<StoredTrack[]> {
  const db = await openDB();
  
  const metadataList: any[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  const tracksWithBlobs: StoredTrack[] = [];
  for (const meta of metadataList) {
    const blob: Blob | null = await new Promise((resolve, reject) => {
      const tx = db.transaction('audioData', 'readonly');
      const store = tx.objectStore('audioData');
      const request = store.get(meta.id);
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });

    if (blob) {
      tracksWithBlobs.push({
        ...meta,
        blob
      });
    } else {
      tracksWithBlobs.push({
        ...meta,
        isMissingAudio: true
      });
    }
  }

  return tracksWithBlobs;
}

export async function createRecordingSession(session: RecordingSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readwrite');
    const store = tx.objectStore('recordingSessions');
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecordingChunk(chunk: RecordingChunk): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readwrite');
    const store = tx.objectStore('recordingChunks');
    const request = store.put(chunk);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordingSession(id: string): Promise<RecordingSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readonly');
    const store = tx.objectStore('recordingSessions');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateRecordingSession(id: string, patch: Partial<RecordingSession>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readwrite');
    const store = tx.objectStore('recordingSessions');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        const updated = { ...existing, ...patch };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        reject(new Error(`Session ${id} not found`));
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getChunksForSession(sessionId: string): Promise<RecordingChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readonly');
    const store = tx.objectStore('recordingChunks');
    
    try {
      const index = store.index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));
      request.onsuccess = () => {
        const results: RecordingChunk[] = request.result || [];
        resolve(results.sort((a, b) => a.index - b.index));
      };
      request.onerror = () => reject(request.error);
    } catch (e) {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: RecordingChunk[] = request.result || [];
        const filtered = all.filter(c => c.sessionId === sessionId);
        resolve(filtered.sort((a, b) => a.index - b.index));
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function getPendingRecordingSessions(): Promise<RecordingSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readonly');
    const store = tx.objectStore('recordingSessions');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: RecordingSession[] = request.result || [];
      resolve(all.filter(s => s.active && s.chunkCount > 0));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markSessionFinalized(sessionId: string, trackId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingSessions', 'readwrite');
    const store = tx.objectStore('recordingSessions');
    const getReq = store.get(sessionId);
    getReq.onsuccess = () => {
      const session = getReq.result;
      if (session) {
        session.active = false;
        session.finalizedTrackId = trackId;
        session.finalizedAt = Date.now();
        const putReq = store.put(session);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteRecordingSessionAndChunks(sessionId: string): Promise<void> {
  const db = await openDB();
  
  const chunkIds: string[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readonly');
    const store = tx.objectStore('recordingChunks');
    try {
      const index = store.index('sessionId');
      const request = index.getAllKeys(IDBKeyRange.only(sessionId));
      request.onsuccess = () => resolve((request.result as string[]) || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: RecordingChunk[] = request.result || [];
        resolve(all.filter(c => c.sessionId === sessionId).map(c => c.id));
      };
      request.onerror = () => reject(request.error);
    }
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['recordingSessions', 'recordingChunks'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    tx.objectStore('recordingSessions').delete(sessionId);
    const chunkStore = tx.objectStore('recordingChunks');
    for (const cid of chunkIds) {
      chunkStore.delete(cid);
    }
  });
}

export interface AppSettings {
  podcastName: string;
  participants: string;
  scriptContent: string;
  scriptMode: 'text' | 'cards';
  scriptCards: any[];
  activeCardIndex: number;
  aiStudentNotes: string;
  aiStructure: string;
  aiOutputFormat: string;
  aiDuration: string;
  aiArchetype: string;
  trackIdsOrder?: string[];
}

export function saveSettingsToLocalStorage(settings: AppSettings) {
  try {
    localStorage.setItem('smbk_podcast_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function loadSettingsFromLocalStorage(): AppSettings | null {
  try {
    const data = localStorage.getItem('smbk_podcast_settings');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load settings from localStorage:', e);
    return null;
  }
}

export function getConsentStatus(): boolean {
  return true;
}

export function setConsentStatus(accepted: boolean): void {
  try {
    localStorage.setItem('smbk_storage_consent_accepted', accepted ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save consent status:', e);
  }
}

import { escapeHtml } from './escapeHtml';
import { projectBackupSchema, ProjectBackup } from './projectSchema';

export { escapeHtml, projectBackupSchema };
export type { ProjectBackup };


