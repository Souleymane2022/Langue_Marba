"use client";

/**
 * Enregistrements de prononciation (voix de locuteurs natifs) stockés dans
 * IndexedDB sur l'appareil. Ils peuvent être exportés pour constituer un
 * corpus audio Marba (base d'une future synthèse / reconnaissance vocale).
 */
const DB = "marba-audio";
const STORE = "recordings";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveRecording = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const getRecording = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key));
export const deleteRecording = (key: string) => tx("readwrite", (s) => s.delete(key));
export const listRecordingKeys = () => tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
