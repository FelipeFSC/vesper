import { binaryAssets, type ImageAsset, type ImageAssets } from './image-assets.ts';

interface Story {
  state: unknown;
  savedAt: number;
  assets?: ImageAssets;
}

interface StoryRecord {
  state: unknown;
  savedAt: number;
  assetSchema: 2;
  assetIds: string[];
}

const mediaKey = (story: string, id: string) => 'story-media:' + story + ':' + id;
const queues = new Map<string, Promise<unknown>>();

function inOrder<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(operation);
  queues.set(key, pending);
  void pending.finally(() => { if (queues.get(key) === pending) queues.delete(key); }).catch(() => {});
  return pending;
}

export function readStory(db: IDBDatabase, store: string, key: string): Promise<Story | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const records = tx.objectStore(store);
    const head = records.get(key);
    let legacy: Story | undefined;
    let header: StoryRecord | undefined;
    const media: [string, IDBRequest<ImageAsset>][] = [];
    head.onsuccess = () => {
      const record = head.result;
      if (record?.assetSchema !== 2) { legacy = record; return; }
      header = record;
      for (const id of (record as StoryRecord).assetIds) media.push([id, records.get(mediaKey(key, id))]);
    };
    tx.oncomplete = () => {
      if (!header) { resolve(legacy ? { ...legacy, assets: binaryAssets(legacy.assets ?? {}) } : undefined); return; }
      const { state, savedAt } = header;
      const assets: ImageAssets = Object.create(null);
      for (const [id, request] of media) {
        if (request.result === undefined) { reject(new Error('Imagem salva ausente: ' + id)); return; }
        assets[id] = request.result;
      }
      resolve({ state, savedAt, assets });
    };
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export function writeStory(db: IDBDatabase, store: string, key: string, story: Story): Promise<void> {
  const { state, savedAt } = structuredClone({ state: story.state, savedAt: story.savedAt });
  const media = Object.entries(binaryAssets(story.assets ?? {}));
  return inOrder(key, async () => {
    await modifyStory(db, store, key, (records, previous) => {
      const ids = new Set(media.map(([id]) => id));
      for (const id of previous) if (!ids.has(id)) records.delete(mediaKey(key, id));
      for (const [id, asset] of media) records.put(asset, mediaKey(key, id));
      records.put({ state, savedAt, assetSchema: 2, assetIds: [...ids] } satisfies StoryRecord, key);
    });
  });
}

export function deleteStory(db: IDBDatabase, store: string, key: string): Promise<void> {
  return inOrder(key, () => modifyStory(db, store, key, (records, ids) => {
    for (const id of ids) records.delete(mediaKey(key, id));
    records.delete(key);
  }));
}

function modifyStory(db: IDBDatabase, store: string, key: string, update: (records: IDBObjectStore, previous: string[]) => void) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const records = tx.objectStore(store);
    const head = records.get(key);
    head.onsuccess = () => {
      try { update(records, head.result?.assetSchema === 2 ? head.result.assetIds : []); }
      catch (error) { tx.abort(); reject(error); }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
