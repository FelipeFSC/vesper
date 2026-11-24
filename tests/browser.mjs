import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { verifyNetwork } from './network.mjs';

const params = process.argv.slice(2);
const legacy = params.filter((arg) => arg.startsWith('--legacy=')).map((arg) => arg.slice(9));
const root = params.find((arg) => arg.startsWith('--root='))?.slice(7) || 'dist';
const legacyRoot = params.find((arg) => arg.startsWith('--legacy-root='))?.slice(14);
const channel = process.env.VESPER_BROWSER || 'chrome';
const server = await serve(root, '/vesper/');
let browser;
let legacyServer;

async function checkPage(url, test, init) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['https://*'] });
    if (init) await init(page);
    await page.goto(server.url + url);
    await test(page);
    assert.deepEqual(errors, [], url);
    console.log('OK', url);
  } finally {
    await context.close();
  }
}

try {
  browser = await chromium.launch({ channel, args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  if (params.includes('--network')) {
    if (legacyRoot) legacyServer = await serve(legacyRoot, '/vesper/');
    const repetitions = params.includes('--repeat') ? 3 : 1;
    for (let i = 0; i < repetitions; i++) console.log(await verifyNetwork(browser, server.url, legacyServer?.url));
  }
  if (legacy.length) {
    for (const name of legacy) {
      assert.match(name, /^[a-z0-9_]+$/i);
      const standalone = /^(assist5e|atrib5e|ficha5e|criatura5e|ficha|multi5e|imagens_pagina|pagina_arte|ficha_acoes|bloco_criatura)$/.test(name);
      const finish = {
        lightdrag: 'cancelou o arraste:', bestiario: 'fim do bestiário', ficha: 'largura: página ', ficha5e: 'largura ', assist5e: 'Torvin: ',
        assist5e_mesa: 'Kael nível 3:', stories: 'importou como nova:',
        criatura5e: 'Dragão: ', multi5e: 'Cleric 3 / Wizard 3:', animsom: 'cartão: opções ',
        ficha5e_mesa: 'Rajada CD 40 Con: ',
        nofile: 'jogador tentando remover outro:', atrib5e: 'atributos confirmados na ficha',
        walk: 'chance 1d20+3', cadastros: 'largura sem rolagem horizontal: ', paredes57: 'fim das paredes 57', somobjeto: 'fim do som em objeto', dados3d: 'fim dos dados 3D', formas: 'fim das formas', foco: 'fim do foco', imagens: 'fim das imagens', imagens_pagina: 'fim das imagens da página', token3d: 'fim do token 3D', token3d_relogio: 'fim do relógio', janela_arte: 'fim da janela com arte', dados_chat: 'fim dos dados no chat', pagina_arte: 'fim da arte na página', ficha_acoes: 'fim das ações da ficha', bloco_criatura: 'fim do bloco da criatura', bloco_criatura_mesa: 'fim do bloco da criatura na mesa', chat_cores: 'fim das cores no chat', ficha_acoes_mesa: 'fim das ações da ficha na mesa',
      }[name];
      await checkPage(standalone ? 'ficha.html' : name === 'cadastros' ? 'cadastros.html' : name === 'stories' ? 'index.html' : 'index.html?tutorial',
        async (page) => {
          const log = page.locator('body[data-log]');
          await log.waitFor({ timeout: 240000 });
          if (finish) await page.waitForFunction((text) => {
            const rows = JSON.parse(document.body.getAttribute('data-log') || '[]');
            return rows.some((row) => row.startsWith(text) || /^EXC|^erros: (?!\[\])/.test(row));
          }, finish, { timeout: 180000 });
          const rows = JSON.parse(await log.getAttribute('data-log'));
          console.log(rows.join('\n'));
          assert.ok(rows.length);
          assert.ok(!rows.some((line) => /^(EXC|FALHOU|falha\b)|^erros: (?!\[\])/i.test(line)));
          if (name === 'walk') {
            assert.ok(rows.some((line) => line.startsWith('final: Pronto')));
            assert.ok(rows.every((line) => !line.includes('NÃO CONCLUIU')));
          }
        }, (page) => page.addInitScript({ path: '.claude/testes/' + name + '.js' }));
    }
  } else if (!params.includes('--network')) {
    await checkPage('index.html?tutorial', async (page) => {
      await page.waitForFunction(() => window.App?.Tutorial?.ids?.hero && window.App.Board.dpr === 2);
      await page.evaluate(() => window.App.UI.showTab('table'));
      await page.locator('#board-resolution').selectOption('economy');
      await page.waitForFunction(() => window.App.Board.dpr === 1);
      await page.reload();
      await page.waitForFunction(() => window.App?.Tutorial?.ids?.hero && window.App.Board.canvas.width > 0);
      assert.equal(await page.evaluate(() => window.App.Board.dpr), 1);
      await page.evaluate(() => {
        const { Store, UI } = window.App;
        UI.showTab('chat');
        Store.dispatch({ type: 'chat.add', msg: { id: 'browser-test', text: 'Teste de chat', ts: Date.now(), playerId: Store.me.id, name: Store.me.name } });
      });
      await page.locator('#chat-log .msg').filter({ hasText: 'Teste de chat' }).waitFor();
      const stable = await page.evaluate(async () => {
        const { Store, Tutorial, UI } = window.App;
        const id = Tutorial.ids.heroActor;
        UI.openActor(id, 'config');
        UI.showTab('table');
        await new Promise(requestAnimationFrame);
        const control = document.querySelector('#board-resolution');
        control.focus();
        Store.dispatch({ type: 'bar.change', actorId: id, bar: 0, delta: -1 });
        await new Promise(requestAnimationFrame);
        return control === document.querySelector('#board-resolution') && document.activeElement === control;
      });
      assert.equal(stable, true);
      await page.evaluate(() => window.App.Bestiary.open());
      await page.locator('.bst-win').waitFor();
    });
    await checkPage('index.html', async (page) => {
      const worker = page.waitForEvent('worker', { predicate: (worker) => worker.url().includes('vision.worker') });
      const result = await page.evaluate(async () => {
        const { Store, Light } = window.App;
        const state = Store.newCampaign();
        const scene = state.scenes[state.activeSceneId];
        scene.walls = [{ id: 'door', x1: 100, y1: 10, x2: 100, y2: 300, door: true }];
        for (let i = 0; i < 500; i++) scene.walls.push({ x1: 500 + i, y1: 500, x2: 500 + i, y2: 520 });
        Store.setState(state);
        const position = { x: 50, y: 100 };
        const radius = Math.hypot(scene.cols * scene.grid, scene.rows * scene.grid) * 1.5;
        const before = Light.visibility(scene, position.x, position.y, radius, 1.7);
        Light.prefetch(scene, { x: 60, y: 100 }, 1.7, () => ({ ...position, eye: 1.7 }));
        Store.dispatch({ type: 'wall.door', sceneId: scene.id, id: 'door', open: true });
        const open = Light.visibility(scene, position.x, position.y, radius, 1.7);
        const blocked = Light.blocked(scene, 50, 100, 150, 100, 1.7);
        const replacement = structuredClone(state);
        replacement.scenes[scene.id].walls[0].open = false;
        Store.setState(replacement);
        const closed = Light.visibility(Store.currentScene(), position.x, position.y, radius, 1.7);
        const next = { x: 62, y: 100 };
        Light.prefetch(Store.currentScene(), next, 1.7, () => ({ ...next, eye: 1.7 }));
        return {
          blocked, longer: open.some((value, i) => value !== before[i]),
          restored: JSON.stringify(closed) === JSON.stringify(before),
        };
      });
      await worker;
      await page.waitForFunction(() => [...window.App.Light.cache.keys()].some((key) => key.startsWith('62,100,')));
      assert.equal(await page.evaluate(() => [...window.App.Light.cache.keys()].some((key) => key.startsWith('60,100,'))), false);
      assert.deepEqual(result, { blocked: false, longer: true, restored: true });
    });
    await checkPage('index.html', async (page) => {
      const result = await page.evaluate(async () => {
        const { Images, Storage, Store } = window.App;
        const state = Store.newCampaign();
        const id = 'img_0000000000000345';
        const data = 'data:image/png;base64,AQIDBA==';
        const key = 'story:browser-migration';
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('mesarpg', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        function raw(key, value) {
          return new Promise((resolve, reject) => {
            const tx = db.transaction('kv', value ? 'readwrite' : 'readonly');
            const store = tx.objectStore('kv');
            const request = value ? store.put(value, key) : store.get(key);
            tx.oncomplete = () => resolve(request.result);
            tx.onerror = () => reject(tx.error);
          });
        }
        await raw(key, { state, assets: { [id]: data }, savedAt: 1 });
        const old = await Storage.kv.get(key);
        await Storage.kv.set(key, old);
        const header = await raw(key);
        const media = await raw('story-media:' + key + ':' + id);
        const bundle = await Storage.storyBundle('browser-migration');
        const loaded = await Storage.kv.get(key);
        loaded.state.scenes[loaded.state.activeSceneId].bg = id;
        Store.setState(loaded.state, loaded.assets, true);
        const url = Images.src(id);
        const bytes = await (await fetch(url)).arrayBuffer();
        const runtimeBinary = Store.assets[id].blob instanceof Blob && url.startsWith('blob:') && bytes.byteLength === 4;
        const sameUrl = Images.src(id) === url;
        const scene = await Storage.sceneBundle(loaded.state.activeSceneId);
        const encoded = await Storage.toCode(await Storage.campaignBundle());
        const restored = await Storage.parse(encoded);
        Store.setState(Store.newCampaign(), {}, true);
        let released = false;
        try { await fetch(url); } catch { released = Images.src(id) === null; }
        const put = IDBObjectStore.prototype.put;
        let failed = false;
        try {
          IDBObjectStore.prototype.put = function (value, id) {
            if (id === key) throw new DOMException('Simulação de quota', 'QuotaExceededError');
            return put.call(this, value, id);
          };
          await Storage.kv.set(key, { state, assets: {}, savedAt: 2 });
        } catch (error) { failed = error.name === 'QuotaExceededError'; }
        finally { IDBObjectStore.prototype.put = put; }
        const intact = (await Storage.storyBundle('browser-migration')).assets[id] === data;
        db.close();
        return { schema: header.assetSchema, blob: media.blob instanceof Blob, same: bundle.assets[id] === data, failed, intact,
          runtimeBinary, sameUrl, released, scene: scene.assets[id] === data, code: restored.assets[id] === data };
      });
      assert.deepEqual(result, { schema: 2, blob: true, same: true, failed: true, intact: true,
        runtimeBinary: true, sameUrl: true, released: true, scene: true, code: true });
    });
    await checkPage('ficha.html', async (page) => {
      await page.waitForFunction(() => window.App?.Ficha?.ready);
      await page.locator('#fp-back').waitFor();
      const file = await page.evaluate(async () => {
        const { Ficha } = window.App;
        const data = document.createElement('canvas').toDataURL();
        const imageId = 'img_' + window.App.U.hash(data);
        const actor = Ficha.importObj({ format: 'mesarpg-actor', actor: { name: 'Retrato', img: imageId }, assets: { [imageId]: data } });
        await Ficha.saveNow();
        return { imageId, actorId: actor.id, data };
      });
      await page.reload();
      await page.waitForFunction(() => window.App?.Ficha?.ready);
      const result = await page.evaluate(async ({ imageId, actorId, data }) => {
        const { Ficha } = window.App;
        const a = Ficha.actors[actorId];
        return { blob: Ficha.assets[imageId].blob instanceof Blob, same: (await Ficha.bundle(a)).assets[imageId] === data,
          avatar: document.querySelector('#fp-main .fp-avatar').style.background.includes('blob:') };
      }, file);
      assert.deepEqual(result, { blob: true, same: true, avatar: true });
    });
    await checkPage('cadastros.html', async (page) => {
      const list = page.locator('#cd-list');
      const option = list.getByRole('option');
      await option.first().waitFor();
      const count = Number(await option.first().getAttribute('aria-setsize'));
      assert.ok(count > 300 && await option.count() < 60);
      await list.focus();
      await list.press('End');
      const last = option.locator('xpath=self::*[@aria-posinset="' + count + '"]');
      await last.waitFor();
      await list.press('Enter');
      await page.waitForFunction(() => document.querySelector('#cd-list [aria-selected="true"]'));
      const selected = await last.getAttribute('data-id');
      assert.equal(await page.evaluate(() => window.App.Cadastros.sel[window.App.Cadastros.tab]), selected);
      await list.press('Home');
      await page.waitForFunction(() => document.querySelector('#cd-list [aria-posinset="1"]'));
      assert.equal(await last.count(), 0);
      const name = await list.locator('[aria-posinset="1"] b').textContent();
      await page.locator('.cd-search').fill(name);
      await page.waitForFunction((previous) => Number(document.querySelector('#cd-list [aria-setsize]')?.getAttribute('aria-setsize')) < previous, count);
      assert.equal(await page.locator('.cd-search').evaluate((el) => document.activeElement === el), true);
    });
    await checkPage('wiki/index.html', async (page) => {
      assert.ok(await page.locator('img').first().evaluate((el) => el.complete && el.naturalWidth > 0));
    });
  }
} finally {
  await browser?.close();
  await legacyServer?.close();
  await server.close();
}
