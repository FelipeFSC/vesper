import { wallIndex, wallPolygon, type WallEntry } from '../geometry/wall-visibility';

interface Request {
  revision: number;
  sequence: number;
  patch?: { from: number; start: number; remove: number; entries: Float64Array<ArrayBuffer> };
  x: number;
  y: number;
  radius: number;
  eye: number;
}

let revision = -1;
let index: ReturnType<typeof wallIndex>;
let walls: WallEntry[] = [];
self.addEventListener('message', ({ data }: MessageEvent<Request>) => {
  if (data.patch) {
    const { from, start, remove, entries: a } = data.patch;
    if (from !== revision) return;
    const inserted: WallEntry[] = [];
    for (let i = 0; i < a.length; i += 8) inserted.push({
      seg: [a[i], a[i + 1], a[i + 2], a[i + 3]],
      border: !!a[i + 4], absolute: !!a[i + 5], stopsLight: !!a[i + 6], height: a[i + 7],
    });
    walls = walls.slice(0, start).concat(inserted, walls.slice(start + remove));
    index = wallIndex(walls);
    revision = data.revision;
  }
  if (data.revision !== revision) return;
  const points = Float64Array.from(wallPolygon(index, data.x, data.y, data.radius, data.eye));
  self.postMessage({ revision, sequence: data.sequence, points }, { transfer: [points.buffer] });
});
