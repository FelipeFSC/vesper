export const scenarios = {
  pequeno: { tokens: 20, walls: 100, lights: 4, viewers: 1 },
  medio: { tokens: 100, walls: 500, lights: 12, viewers: 2 },
  estresse: { tokens: 300, walls: 2000, lights: 30, viewers: 4 },
};

export function buildScene(config, scene, actorId) {
  scene.id = 'benchmark';
  const grid = scene.grid;
  scene.cols = 64;
  scene.rows = 48;
  scene.light = { enabled: config.enabled, global: false, explore: false };
  for (let i = 0; i < config.tokens; i++) {
    const token = {
      id: 'token-' + i, actorId, name: 'Token ' + i,
      x: grid * (2 + (i * 17) % 59), y: grid * (2 + (i * 11) % 43),
      size: 1, color: '#9677cc', owner: i < config.viewers ? 'benchmark-player' : '',
      bars: [{ name: 'PV', value: 20, max: 20 }],
      darkvision: i < config.viewers ? 8 : 0,
    };
    scene.tokens[token.id] = token;
  }
  scene.walls = Array.from({ length: config.walls }, (_, i) => {
    const x = grid * (5 + (i * 97 % 1603) / 29);
    const y = grid * (4 + (i * 43 % 1301) / 31);
    return { id: 'wall-' + i, x1: x, y1: y, x2: x + (i % 2 ? grid : 0), y2: y + (i % 2 ? 0 : grid), cover: 'full' };
  });
  scene.lights = Array.from({ length: config.lights }, (_, i) => ({
    id: 'light-' + i, kind: 'light', name: 'Luz ' + i, shape: i % 3 === 0 ? 'cone' : 'circle',
    x: grid * (3 + (i * 7 % 59)), y: grid * (3 + (i * 13 % 43)),
    color: '#ffb45a', bright: 4, dim: 8, dir: 30, angle: 60, on: true,
  }));
  scene.bg = 'benchmark-map';
  scene.props.push({ id: 'benchmark-object', img: scene.bg, x: 280, y: 280, w: 140, h: 105, rot: 30, z: 1 });
  return scene;
}

export function createMap() {
  const map = document.createElement('canvas');
  map.width = 640;
  map.height = 480;
  const ctx = map.getContext('2d');
  ctx.fillStyle = '#3a3934';
  ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#44463d';
  for (let i = 0; i < 30; i++) ctx.fillRect((i * 37) % 600, (i * 71) % 440, 40, 40);
  return map;
}

export function makeFixture(config) {
  const { Store, Board, UI } = window.App;
  const state = Store.newCampaign(), actor = Object.values(state.actors)[0];
  const scene = buildScene(config, Store.newScene('Benchmark'), actor.id);
  const second = Store.newScene('Benchmark · segunda cena');
  second.id = 'benchmark-2';
  state.scenes = { [scene.id]: scene, [second.id]: second };
  state.sceneOrder = [scene.id, second.id];
  state.activeSceneId = scene.id;
  state.rules.liveRuler = config.mode === 'live';
  Store.viewSceneId = null;
  Store.setState(state, { [scene.bg]: createMap().toDataURL() });
  UI.setViewAs(config.player ? 'benchmark-player' : null);
  if (!config.player) Board.layers.lights = false;
  Board.fit();
  return { actor, Board, scene, second, Store, UI };
}
