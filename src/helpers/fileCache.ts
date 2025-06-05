import {openDB} from 'idb';

const dbPromise = openDB('nebula-transfer', 1, {
  upgrade(db) {
    db.createObjectStore('files');
  }
});

export async function cacheChunk(fileId: string, index: number, chunk: ArrayBuffer) {
  const db = await dbPromise;
  await db.put('files', chunk, `${fileId}-${index}`);
}

export async function readChunk(fileId: string, index: number): Promise<ArrayBuffer | undefined> {
  const db = await dbPromise;
  return db.get('files', `${fileId}-${index}`);
}

export async function assembleFile(fileId: string, total: number, fileType: string): Promise<Blob> {
  const db = await dbPromise;
  const chunks: ArrayBuffer[] = [];
  for (let i = 0; i < total; i++) {
    const chunk = await db.get('files', `${fileId}-${i}`);
    if (chunk) chunks.push(chunk);
  }
  return new Blob(chunks, {type: fileType});
}
