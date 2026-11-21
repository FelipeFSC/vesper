import test from 'node:test';
import assert from 'node:assert/strict';
import { bounds, segmentBounds, SpatialIndex } from '../src/geometry/spatial.ts';
import { crosses, visibilityPolygon } from '../src/geometry/visibility.ts';

test('o índice inclui segmentos que tocam as bordas da região', () => {
  const walls = Array.from({ length: 90 }, (_, i) => [i * 4, 0, i * 4, 200]);
  const tree = new SpatialIndex(walls, segmentBounds);
  assert.deepEqual(tree.search(bounds(8, 5, 20, 40)).map((wall) => wall[0]).sort((a, b) => a - b), [8, 12, 16, 20]);
  assert.equal(crosses(walls[2], 0, 5, 12, 5), true);
  assert.equal(crosses(walls[2], 0, 5, 8, 5), false);
});

test('a busca indexada replica as interseções do cálculo linear', () => {
  const segs = Array.from({ length: 400 }, (_, i) => {
    const x = (i * 87) % 619 - 30, y = (i * 77) % 383 - 40;
    return [x, y, x + (i % 13) * 4, y - (i % 9) * 10];
  });
  for (const [ox, oy] of [[0, 0], [30, 65], [206, 100], [635, 1]]) {
    const expected = [];
    const angles = [];
    for (const s of segs) for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) {
      const angle = Math.atan2(y - oy, x - ox);
      angles.push(angle - 1e-4, angle, angle + 1e-4);
    }
    for (let i = 0; i < 64; i++) angles.push(-Math.PI + (i / 64) * Math.PI * 2);
    angles.sort((a, b) => a - b);
    for (const angle of angles) {
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let d = 720;
      for (const [ax, ay, bx, by] of segs) {
        const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const x = ax - ox, y = ay - oy;
        const t = (x * ey - y * ex) / den, u = (x * dy - y * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < d) d = t;
      }
      expected.push(ox + dx * d, oy + dy * d);
    }
    assert.deepEqual(visibilityPolygon(segs, ox, oy, 720), expected);
  }
});
