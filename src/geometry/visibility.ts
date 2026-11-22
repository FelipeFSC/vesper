import { rayDistance, raySearch, type Segment } from './spatial.ts';

export function visibilityPolygon(segments: readonly Segment[], ox: number, oy: number, radius: number): number[] {
  const angles: number[] = [];
  for (const [x1, y1, x2, y2] of segments) {
    const start = Math.atan2(y1 - oy, x1 - ox);
    const end = Math.atan2(y2 - oy, x2 - ox);
    angles.push(start - 1e-4, start, start + 1e-4, end - 1e-4, end, end + 1e-4);
  }
  for (let i = 0; i < 64; i++) angles.push(-Math.PI + (i / 64) * Math.PI * 2);
  angles.sort((a, b) => a - b);
  const points: number[] = [];
  const search = segments.length >= 48 ? raySearch(segments) : null;
  for (const angle of angles) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let distance = radius;
    if (search) distance = search(ox, oy, dx, dy, radius);
    else for (const segment of segments) distance = rayDistance(segment, ox, oy, dx, dy, distance);
    points.push(ox + dx * distance, oy + dy * distance);
  }
  return points;
}

const cross = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
  (qx - px) * (ry - py) - (qy - py) * (rx - px);
const separated = (a: number, b: number) => (a > 1e-6 && b < -1e-6) || (a < -1e-6 && b > 1e-6);

export function crosses(segment: Segment, ax: number, ay: number, bx: number, by: number): boolean {
  const [x1, y1, x2, y2] = segment;
  return separated(cross(x1, y1, x2, y2, ax, ay), cross(x1, y1, x2, y2, bx, by))
    && separated(cross(ax, ay, bx, by, x1, y1), cross(ax, ay, bx, by, x2, y2));
}
