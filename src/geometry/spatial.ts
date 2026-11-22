import RBush, { type BBox } from 'rbush';

export type Bounds = BBox;
export type Segment = readonly [number, number, number, number];

export function bounds(x1: number, y1: number, x2: number, y2: number): Bounds {
  return { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) };
}

export class SpatialIndex<T> {
  private readonly entries: (Bounds & { value: T })[];
  private readonly tree?: RBush<Bounds & { value: T }>;

  constructor(values: T[], box: (value: T) => Bounds) {
    this.entries = values.map((value) => ({ ...box(value), value }));
    if (this.entries.length >= 32) {
      this.tree = new RBush();
      this.tree.load(this.entries);
    }
  }

  search(box: Bounds): T[] {
    const entries = this.tree?.search(box) ?? this.entries.filter((entry) =>
      entry.minX <= box.maxX && entry.maxX >= box.minX && entry.minY <= box.maxY && entry.maxY >= box.minY);
    return entries.map((entry) => entry.value);
  }
}

export const segmentBounds = (segment: Segment) => bounds(...segment);

interface RayNode extends Bounds {
  children?: RayNode[];
  segment?: Segment;
}

function approaches(box: Bounds, x: number, y: number, dx: number, dy: number, distance: number): boolean {
  const left = dx === 0 ? -Infinity : (box.minX - x) / dx;
  const right = dx === 0 ? Infinity : (box.maxX - x) / dx;
  const top = dy === 0 ? -Infinity : (box.minY - y) / dy;
  const bottom = dy === 0 ? Infinity : (box.maxY - y) / dy;
  if ((dx === 0 && (x < box.minX || x > box.maxX)) || (dy === 0 && (y < box.minY || y > box.maxY))) return false;
  const near = Math.max(0, Math.min(left, right), Math.min(top, bottom));
  const far = Math.min(distance, Math.max(left, right), Math.max(top, bottom));
  return near <= far + 1e-8;
}

export function rayDistance(segment: Segment, x: number, y: number, dx: number, dy: number, distance: number): number {
  const ex = segment[2] - segment[0], ey = segment[3] - segment[1];
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return distance;
  const wx = segment[0] - x, wy = segment[1] - y;
  const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
  return t > 0 && u >= 0 && u <= 1 && t < distance ? t : distance;
}

export function raySearch(segments: readonly Segment[]) {
  const root: RayNode = new RBush<RayNode>().load(segments.map((segment) => ({ ...segmentBounds(segment), segment }))).toJSON();
  function visit(node: RayNode, x: number, y: number, dx: number, dy: number, distance: number): number {
    if (!approaches(node, x, y, dx, dy, distance)) return distance;
    if (node.segment) return rayDistance(node.segment, x, y, dx, dy, distance);
    for (const child of node.children!) distance = visit(child, x, y, dx, dy, distance);
    return distance;
  }
  return (x: number, y: number, dx: number, dy: number, distance: number) => visit(root, x, y, dx, dy, distance);
}
