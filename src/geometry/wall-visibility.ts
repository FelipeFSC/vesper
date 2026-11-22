import { bounds, segmentBounds, SpatialIndex, type Segment } from './spatial.ts';
import { visibilityPolygon } from './visibility.ts';

export interface WallEntry {
  seg: Segment;
  border?: boolean;
  absolute?: boolean;
  stopsLight?: boolean;
  height?: number | null;
  passable?: boolean;
  /** Janela fechada (Plano 57): não tapa luz nem visão, só movimento e ataque. */
  window?: boolean;
}

export function blocks(entry: WallEntry, eyeH: number): boolean {
  if (!(eyeH > 0)) return !!entry.stopsLight;
  return !!entry.absolute || (entry.height != null && entry.height >= eyeH - 1e-9);
}

export const wallIndex = (entries: WallEntry[]) => new SpatialIndex(entries, (entry) => segmentBounds(entry.seg));

export function wallPolygon(index: SpatialIndex<WallEntry>, x: number, y: number, radius: number, eye: number): number[] {
  const found = index.search(bounds(x - radius, y - radius, x + radius, y + radius));
  return visibilityPolygon(found.filter((entry) => entry.border || blocks(entry, eye)).map((entry) => entry.seg), x, y, radius);
}
