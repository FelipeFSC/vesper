import { buildScene, createMap, scenarios } from './fixtures.mjs';
import { wallIndex, wallPolygon } from '../src/geometry/wall-visibility.ts';

function fixture(name) {
  const scene = buildScene({ ...scenarios[name], enabled: true }, { grid: 70, tokens: {}, props: [] }, 'demo');
  const width = scene.cols * scene.grid, height = scene.rows * scene.grid;
  const map = createMap();
  const mask = document.createElement('canvas');
  mask.width = width / 2;
  mask.height = height / 2;
  const light = mask.getContext('2d');
  light.scale(.5, .5);
  light.fillStyle = 'rgba(12,8,19,.72)';
  light.fillRect(0, 0, width, height);
  const index = wallIndex(scene.walls.map((w) => ({ seg: [w.x1, w.y1, w.x2, w.y2], stopsLight: true })));
  light.globalCompositeOperation = 'destination-out';
  for (const s of scene.lights) {
    const radius = s.dim * scene.grid;
    const poly = wallPolygon(index, s.x, s.y, radius, 0);
    light.save();
    light.beginPath();
    light.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) light.lineTo(poly[i], poly[i + 1]);
    light.closePath();
    light.clip();
    if (s.shape === 'cone') {
      light.beginPath();
      light.moveTo(s.x, s.y);
      light.arc(s.x, s.y, radius, (s.dir - s.angle / 2) * Math.PI / 180, (s.dir + s.angle / 2) * Math.PI / 180);
      light.closePath();
      light.clip();
    }
    const glow = light.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
    glow.addColorStop(0, '#000');
    glow.addColorStop(.45, '#000');
    glow.addColorStop(1, 'transparent');
    light.fillStyle = glow;
    light.fillRect(s.x - radius, s.y - radius, radius * 2, radius * 2);
    light.restore();
  }
  light.globalCompositeOperation = 'source-over';
  light.fillStyle = '#100e16';
  light.fillRect(width * .67, height * .54, width * .33, height * .46);
  const items = Object.values(scene.tokens).map((t, i) => ({ ...t, token: true, z: i % 3 })).concat(scene.props)
    .sort((a, b) => a.z - b.z || Number(!!a.token) - Number(!!b.token));
  return { width, height, map, mask, items };
}

/** @implements {import('../src/board/renderer.ts').BoardRenderer<ReturnType<typeof fixture>>} */
class CanvasFixture {
  canvas = document.createElement('canvas');
  ctx = this.canvas.getContext('2d');
  async initialize() { document.body.append(this.canvas); }
  resize(width, height, dpr) {
    this.dpr = dpr;
    Object.assign(this.canvas, { width: width * dpr, height: height * dpr });
    Object.assign(this.canvas.style, { width: width + 'px', height: height + 'px' });
  }
  setScene(scene) { this.scene = scene; }
  render({ x, y, zoom, dragX, dragY }) {
    const { ctx, dpr, scene } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#141218';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, -x * zoom * dpr, -y * zoom * dpr);
    ctx.drawImage(scene.map, 0, 0, scene.width, scene.height);
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    for (const item of scene.items) {
      const selected = item.id === 'token-0';
      const px = item.x + (selected ? dragX : 0), py = item.y + (selected ? dragY : 0);
      if (item.token) {
        ctx.fillStyle = selected ? '#b695ff' : '#9677cc';
        ctx.beginPath();
        ctx.arc(px + 35, py + 35, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eee8ff';
        ctx.fillText(item.name, px + 35, py + 85);
      } else {
        ctx.save();
        ctx.translate(px + item.w / 2, py + item.h / 2);
        ctx.rotate(item.rot * Math.PI / 180);
        ctx.drawImage(scene.map, -item.w / 2, -item.h / 2, item.w, item.h);
        ctx.restore();
      }
    }
    ctx.drawImage(scene.mask, 0, 0, scene.width, scene.height);
  }
  dispose() { this.canvas.remove(); }
}

/** @implements {import('../src/board/renderer.ts').BoardRenderer<ReturnType<typeof fixture>>} */
class PixiFixture {
  async initialize() {
    this.pixi = await import('pixi.js');
    this.app = new this.pixi.Application();
    await this.app.init({ preference: 'webgl', autoStart: false, background: '#141218', antialias: true, autoDensity: true });
    document.body.append(this.app.canvas);
    const gl = this.app.renderer.gl;
    const details = gl.getExtension('WEBGL_debug_renderer_info');
    this.info = { gpu: details ? gl.getParameter(details.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
  }
  resize(width, height, dpr) { this.app.renderer.resize(width, height, dpr); }
  setScene(scene) {
    const { Container, Graphics, Sprite, Text, Texture } = this.pixi;
    this.releaseScene();
    this.world = new Container();
    this.app.stage.addChild(this.world);
    const map = Texture.from(scene.map), mask = Texture.from(scene.mask);
    this.textures = [map, mask];
    const layer = (texture) => {
      const sprite = new Sprite(texture);
      Object.assign(sprite, { width: scene.width, height: scene.height });
      this.world.addChild(sprite);
    };
    layer(map);
    for (const item of scene.items) {
      let node;
      if (item.token) {
        node = new Container();
        const selected = item.id === 'token-0';
        node.addChild(new Graphics().circle(35, 35, 30).fill(selected ? '#b695ff' : '#9677cc'));
        const label = new Text({ text: item.name, style: { fontFamily: 'serif', fontSize: 20, fill: '#eee8ff' } });
        label.anchor.set(.5, 1);
        label.position.set(35, 85);
        node.addChild(label);
        node.position.set(item.x, item.y);
        if (selected) this.drag = { node, x: item.x, y: item.y };
      } else {
        node = new Sprite(map);
        node.anchor.set(.5);
        Object.assign(node, { width: item.w, height: item.h, rotation: item.rot * Math.PI / 180 });
        node.position.set(item.x + item.w / 2, item.y + item.h / 2);
      }
      this.world.addChild(node);
    }
    layer(mask);
  }
  render({ x, y, zoom, dragX, dragY }) {
    this.world.position.set(-x * zoom, -y * zoom);
    this.world.scale.set(zoom);
    const { node, x: px, y: py } = this.drag;
    node.position.set(px + dragX, py + dragY);
    this.app.render();
  }
  releaseScene() {
    this.world?.destroy({ children: true });
    for (const texture of this.textures || []) texture.destroy(true);
  }
  async verifyContext(view) {
    const canvas = this.app.canvas, gl = this.app.renderer.gl;
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) return { supported: false };
    const event = (name) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tempo limite aguardando ' + name)), 5000);
      canvas.addEventListener(name, (event) => { event.preventDefault(); clearTimeout(timeout); resolve(); }, { once: true });
    });
    const loss = event('webglcontextlost');
    extension.loseContext();
    await loss;
    const lost = gl.isContextLost(), restored = event('webglcontextrestored');
    setTimeout(() => extension.restoreContext(), 0);
    await restored;
    this.render(view);
    return { supported: true, lost, restored: !gl.isContextLost(), rendered: gl.getError() === gl.NO_ERROR };
  }
  dispose() { this.releaseScene(); this.app.destroy({ removeView: true }, { children: true }); }
}

const now = () => performance.now();
const frame = () => new Promise(requestAnimationFrame);
window.measureRenderer = async (name, backend, dpr, probeContext) => {
  const renderer = backend === 'pixi' ? new PixiFixture() : new CanvasFixture();
  const scene = fixture(name), start = now();
  await renderer.initialize();
  try {
    renderer.resize(1280, 800, dpr);
    renderer.setScene(scene);
    const setup = now() - start;
    let previous = 0;
    const cpu = [], intervals = [];
    for (let i = -6; i < 30; i++) {
      const begin = now();
      renderer.render({ x: 50 + i * 5, y: 50, zoom: 0.5 + i * .005, dragX: i * 4, dragY: i * 2 });
      if (i >= 0) cpu.push(now() - begin);
      const timestamp = await frame();
      if (i >= 0) intervals.push(timestamp - previous);
      previous = timestamp;
    }
    const p95 = (values) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1];
    const context = probeContext ? await renderer.verifyContext({ x: 100, y: 50, zoom: .5, dragX: 0, dragY: 0 }) : undefined;
    return { setup, renderP95: p95(cpu), frameP95: p95(intervals), heap: performance.memory?.usedJSHeapSize, context, ...renderer.info };
  } finally {
    renderer.dispose();
  }
};
