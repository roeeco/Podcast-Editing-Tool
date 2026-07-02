const DB_NAME = 'SmbkPodDB';
const STORE_NAME = 'tracks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
}

export async function saveTrackToDB(track: StoredTrack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(track);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrackFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearTracksFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTracksFromDB(): Promise<StoredTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
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
