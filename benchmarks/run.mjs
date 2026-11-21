import { availableParallelism, cpus } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildScene, createMap, makeFixture, scenarios } from './fixtures.mjs';
import { serve } from '../tests/serve.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const viewport = { width: 1280, height: 800 };
const role = option('--role', 'all');
if (!['all', 'gm', 'player'].includes(role)) throw new Error('Use --role all, gm ou player.');
const variants = [
  { enabled: false, player: false, dpr: 1, mode: 'perf' },
  { enabled: true, player: false, dpr: 1, mode: 'perf' },
  { enabled: true, player: true, dpr: 1, mode: 'perf' },
  { enabled: true, player: true, dpr: 2, mode: 'live' },
].filter(({ player }) => role === 'all' || (role === 'player' ? player : !player));
const target = await serve(option('--root', 'dist'));
let browser;
try {
  browser = await chromium.launch({ channel: option('--channel', 'chrome') });
  const rows = [];
  for (const [name, scene] of Object.entries(scenarios)) {
    for (const variant of variants) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: variant.dpr });
        try {
          const page = await context.newPage();
          const session = await context.newCDPSession(page);
          await session.send('Network.enable');
          await session.send('Network.setBlockedURLs', { urls: ['https://*'] });
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          for (const cache of ['frio', 'quente']) {
            await page.goto(target.url + 'index.html?tutorial', { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => window.App?.Tutorial?.ids?.hero);
            const result = await page.evaluate(async ({ source, settings }) => {
              const fixture = new Function(source)();
              const { actor, Board, scene, second, Store, UI } = fixture(settings);
              const frame = () => new Promise(requestAnimationFrame);
              const quantile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(p * values.length) - 1];
              const timings = { render: [], light: [], frame: [], long: [] };
              const observe = (method, object) => {
                const original = object[method];
                object[method] = function (...params) {
                  const start = performance.now();
                  try { return original.apply(this, params); }
                  finally { timings[method].push(performance.now() - start); }
                };
                return () => { object[method] = original; };
              };
              const observer = PerformanceObserver.supportedEntryTypes.includes('longtask')
                ? new PerformanceObserver((list) => timings.long.push(...list.getEntries().map((entry) => entry.duration))) : null;
              const interaction = performance.now();
              const net = performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0);
              const t = scene.tokens['token-0'];
              Board.centerOn(t.x + scene.grid / 2, t.y + scene.grid / 2);
              for (let i = 0; i < 4; i++) { Board.requestRender(); await frame(); }
              observer?.observe({ type: 'longtask' });
              const restoreRender = observe('render', Board);
              const renderLight = window.App.Light.render;
              window.App.Light.render = function (...params) {
                const start = performance.now();
                try { return renderLight.apply(this, params); }
                finally { timings.light.push(performance.now() - start); }
              };
              const rect = Board.canvas.getBoundingClientRect();
              const pos = Board.toScreen(t.x + scene.grid / 2, t.y + scene.grid / 2);
              const pointer = (kind, x, y) => Board.canvas.dispatchEvent(new PointerEvent(kind, {
                clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, button: 0,
                buttons: kind === 'pointerup' ? 0 : 1, bubbles: true,
              }));
              pointer('pointerdown', pos.x, pos.y);
              const dragged = Board.drag?.id === t.id;
              let last = await frame();
              for (let i = 0; i < 24; i++) {
                if (i < 12) pointer('pointermove', pos.x + 3 * i, pos.y + i);
                else {
                  if (i === 12) pointer('pointerup', pos.x + 33, pos.y + 11);
                  Board.cam.x += 6;
                  Board.cam.z *= i % 2 ? 1.02 : 1 / 1.02;
                  Board.requestRender();
                }
                const now = await frame();
                timings.frame.push(now - last);
                last = now;
              }
              const sheetStart = performance.now();
              UI.openActor(actor.id);
              await frame();
              const sheet = performance.now() - sheetStart;
              const sceneStart = performance.now();
              Store.dispatch({ type: 'scene.activate', id: second.id });
              await frame();
              const switchScene = performance.now() - sceneStart;
              const switched = Store.currentScene()?.id === second.id;
              restoreRender();
              window.App.Light.render = renderLight;
              observer?.disconnect();
              return {
                frameP50: quantile(timings.frame, .5), frameP95: quantile(timings.frame, .95),
                renderP95: quantile(timings.render, .95), lightP95: quantile(timings.light, .95),
                longTasks: observer ? timings.long.length : null,
                heap: performance.memory?.usedJSHeapSize, transferBytes: net,
                readyMs: interaction, sheetMs: sheet, sceneMs: switchScene, dragged, switched,
              };
            }, { source: [buildScene, createMap, makeFixture].join('\n') + '\nreturn makeFixture;', settings: { ...scene, ...variant } });
            if (!result.dragged || !result.switched) throw new Error('Percurso incompleto para ' + name + ' (' + JSON.stringify(variant) + ')');
            rows.push({ scenario: name, ...scene, ...variant, cache, run, ...result });
          }
          if (errors.length) throw new Error(errors.join('\n'));
        } finally {
          await context.close();
        }
      }
      console.log(name, variant);
    }
  }
  const result = { browser: browser.version(), cpu: cpus()[0]?.model, threads: availableParallelism(), viewport, rows };
  await writeFile(option('--out', 'benchmarks/resultado.local.json'), JSON.stringify(result, null, 2) + '\n');
} finally {
  await browser?.close();
  await target.close();
}
