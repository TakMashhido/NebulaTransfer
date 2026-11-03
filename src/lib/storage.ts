// Received chunks are written to IndexedDB as Blobs so large files do not have to live in RAM.
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'nebula-transfer';
const STORE = 'chunks';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(database) {
        // v1 used a store called "files" keyed by "<peer>-<fileName>-<index>"; drop it.
        for (const name of Array.from(database.objectStoreNames)) database.deleteObjectStore(name);
        database.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

const key = (transferId: string, index: number) => `${transferId}:${String(index).padStart(9, '0')}`;

export async function saveChunk(transferId: string, index: number, data: ArrayBuffer | Uint8Array): Promise<void> {
  await (await db()).put(STORE, new Blob([data]), key(transferId, index));
}

export async function assembleFile(transferId: string, chunks: number, mime: string): Promise<Blob> {
  const database = await db();
  const range = IDBKeyRange.bound(key(transferId, 0), key(transferId, chunks - 1));
  const parts = (await database.getAll(STORE, range)) as Blob[];
  if (parts.length !== chunks) {
    throw new Error(`File is incomplete (${parts.length} of ${chunks} parts stored).`);
  }
  return new Blob(parts, { type: mime || 'application/octet-stream' });
}

export async function deleteFile(transferId: string, chunks: number): Promise<void> {
  const database = await db();
  const last = Math.max(0, chunks - 1);
  await database.delete(STORE, IDBKeyRange.bound(key(transferId, 0), key(transferId, last)));
}

/** Transfers cannot be resumed across reloads, so anything left over is garbage. */
export async function clearAllChunks(): Promise<void> {
  try {
    await (await db()).clear(STORE);
  } catch (err) {
    console.warn('Could not clear cached chunks', err);
  }
}

export async function freeSpace(): Promise<number | null> {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined) return null;
    return Math.max(0, quota - usage);
  } catch {
    return null;
  }
}
