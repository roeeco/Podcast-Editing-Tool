import { z } from 'zod';

const DB_NAME = 'SmbkPodDB';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
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
      if (!db.objectStoreNames.contains('recordingChunks')) {
        db.createObjectStore('recordingChunks', { keyPath: 'id' });
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
  blob: Blob;
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
}

export interface RecordingSession {
  id: string;
  name: string;
  chunks: Blob[];
  lastUpdated: number;
  active: boolean;
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

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const request = store.put(metadata);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audioData', 'readwrite');
    const store = tx.objectStore('audioData');
    const request = store.put({ id: track.id, blob });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
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
        blob: new Blob([], { type: meta.mimeType || 'audio/wav' })
      });
    }
  }

  return tracksWithBlobs;
}

export async function saveRecordingChunkToDB(sessionId: string, name: string, chunk: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readwrite');
    const store = tx.objectStore('recordingChunks');
    const getReq = store.get(sessionId);
    getReq.onsuccess = () => {
      let session: RecordingSession = getReq.result;
      if (!session) {
        session = {
          id: sessionId,
          name,
          chunks: [],
          lastUpdated: Date.now(),
          active: true
        };
      }
      session.chunks.push(chunk);
      session.lastUpdated = Date.now();
      session.active = true;
      const putReq = store.put(session);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getPendingRecordingSessions(): Promise<RecordingSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readonly');
    const store = tx.objectStore('recordingChunks');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: RecordingSession[] = request.result || [];
      resolve(all.filter(s => s.active && s.chunks.length > 0));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function finalizeRecordingSession(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readwrite');
    const store = tx.objectStore('recordingChunks');
    const getReq = store.get(sessionId);
    getReq.onsuccess = () => {
      const session = getReq.result;
      if (session) {
        session.active = false;
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

export async function deleteRecordingSession(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recordingChunks', 'readwrite');
    const store = tx.objectStore('recordingChunks');
    const request = store.delete(sessionId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
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
  try {
    return localStorage.getItem('smbk_storage_consent_accepted') === 'true';
  } catch {
    return false;
  }
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


