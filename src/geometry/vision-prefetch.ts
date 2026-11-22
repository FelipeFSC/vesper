import type { WallEntry } from './wall-visibility';

interface Job {
  revision: number;
  entries: WallEntry[];
  sequence: number;
  x: number;
  y: number;
  radius: number;
  eye: number;
  done: (polygon: Float64Array) => void;
}

let worker: Worker | null = null;
let running: Job | null = null;
let latest: Job | null = null;
let sequence = 0;
let revision = -1;
let sentWalls: WallEntry[] = [];
let unavailable = false;
let timeout: number | undefined;

export function invalidateVision(): void {
  latest = null;
  sequence++;
}

export function prefetchVision(job: Omit<Job, 'sequence'>): void {
  if (unavailable) return;
  latest = { ...job, sequence: ++sequence };
  if (!running) sendLatest();
}

function fail(): void {
  unavailable = true;
  clearTimeout(timeout);
  worker?.terminate();
  worker = running = latest = null;
  sentWalls = [];
}

function sameWall(a: WallEntry, b: WallEntry): boolean {
  return a.border === b.border && a.absolute === b.absolute && a.stopsLight === b.stopsLight && a.height === b.height
    && a.seg.every((coord, i) => coord === b.seg[i]);
}

function changes(walls: WallEntry[]) {
  let start = 0, oldEnd = sentWalls.length, newEnd = walls.length;
  const common = Math.min(oldEnd, newEnd);
  while (start < common && sameWall(sentWalls[start], walls[start])) start++;
  while (oldEnd > start && newEnd > start && sameWall(sentWalls[oldEnd - 1], walls[newEnd - 1])) {
    oldEnd--; newEnd--;
  }
  const entries = new Float64Array((newEnd - start) * 8);
  for (let i = start; i < newEnd; i++) {
    const wall = walls[i];
    entries.set([...wall.seg, Number(!!wall.border), Number(!!wall.absolute), Number(!!wall.stopsLight), wall.height ?? NaN], (i - start) * 8);
  }
  return { from: revision, start, remove: oldEnd - start, entries };
}

function sendLatest(): void {
  if (!latest || unavailable) return;
  try {
    if (!worker) {
      worker = new Worker(new URL('../workers/vision.worker.ts', import.meta.url), { type: 'module' });
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.onmessage = ({ data }) => {
        clearTimeout(timeout);
        const completed = running;
        running = null;
        if (completed && data.revision === completed.revision && data.sequence === sequence && data.sequence === completed.sequence) {
          completed.done(data.points);
        }
        sendLatest();
      };
    }
    running = latest;
    latest = null;
    const job = running;
    const message = { revision: job.revision, sequence: job.sequence, x: job.x, y: job.y, radius: job.radius, eye: job.eye };
    if (revision !== job.revision) {
      const patch = changes(job.entries);
      worker.postMessage({ ...message, patch }, [patch.entries.buffer]);
      sentWalls = job.entries;
      revision = job.revision;
    } else worker.postMessage(message);
    timeout = window.setTimeout(fail, 5000);
  } catch {
    fail();
  }
}
