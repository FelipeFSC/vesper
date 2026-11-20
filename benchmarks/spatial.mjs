import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { scenarios, buildScene } from './fixtures.mjs';
import { bounds, segmentBounds, SpatialIndex } from '../src/geometry/spatial.ts';

const measurements = [];
for (const [name, scenario] of Object.entries(scenarios)) {
  const { walls } = buildScene(scenario, { grid: 70, tokens: {}, props: [] }, 'demo');
  const segments = walls.map((w) => [w.x1, w.y1, w.x2, w.y2]);
  const queries = Array.from({ length: 2000 }, (_, i) => {
    const x = i * 127 % 4200, y = i * 83 % 3200;
    return bounds(x - 200, y - 200, x + 200, y + 200);
  });
  for (let repeat = 0; repeat <= 3; repeat++) {
    const start = performance.now();
    const index = new SpatialIndex(segments, segmentBounds);
    const built = performance.now();
    const indexed = queries.map((query) => index.search(query).length);
    const searched = performance.now();
    const linear = queries.map(({ minX, minY, maxX, maxY }) => segments.filter(([x1, y1, x2, y2]) =>
      Math.min(x1, x2) <= maxX && Math.max(x1, x2) >= minX
      && Math.min(y1, y2) <= maxY && Math.max(y1, y2) >= minY).length);
    const done = performance.now();
    assert.deepEqual(indexed, linear);
    if (repeat) measurements.push({ name, repeat, segments: segments.length, queries: queries.length,
      buildMs: built - start, indexedMs: searched - built, linearMs: done - searched });
  }
}
await writeFile(process.argv[2] || 'benchmarks/espacial.local.json', JSON.stringify(measurements, null, 2) + '\n');
