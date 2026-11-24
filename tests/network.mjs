import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';

export async function verifyNetwork(browser, url, v1Url) {
  const signaling = fork('tests/signaling.mjs');
  const terminating = once(signaling, 'exit');
  const contexts = [];
  try {
    const [port] = await once(signaling, 'message');
    const options = { host: '127.0.0.1', port, path: '/signal', secure: false, config: { iceServers: [] } };
    async function makePage(name, origin = url) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', { urls: ['https://*'] });
      await page.goto(origin + 'index.html');
      await page.waitForFunction(() => window.App?.Store?.me);
      await page.evaluate((name) => { window.App.Store.me = { id: name, name, color: '#aa99dd' }; }, name);
      if (origin === v1Url) {
        await page.addScriptTag({ path: 'node_modules/peerjs/dist/peerjs.js' });
        await page.evaluate((opts) => {
          const BrowserPeer = window.Peer || window.peerjs.Peer;
          window.Peer = function (id) { return id ? new BrowserPeer(id, opts) : new BrowserPeer(opts); };
        }, options);
      }
      return page;
    }
    const host = await makePage('gm-test');
    const players = await Promise.all([makePage('player-a'), makePage('player-b', v1Url)]);
    const asset = await host.evaluate(async (options) => {
      const { Net, Store, Tutorial, UI, U, Audio } = window.App;
      Store.role = 'gm';
      Store.setState(Tutorial.demoState());
      UI.start();
      const sc = Store.currentScene();
      const hero = sc.tokens[Tutorial.ids.hero];
      hero.owner = 'player-a';
      // Imagem local grande o suficiente para atravessar vários blocos.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const image = ctx.createImageData(128, 128);
      let n = 1837;
      for (let i = 0; i < image.data.length; i += 4) {
        n = (1664525 * n + 1013904223) >>> 0;
        image.data[i] = n >>> 24;
        image.data[i + 1] = n >>> 16 & 255;
        image.data[i + 2] = n >>> 8 & 255;
        image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const data = canvas.toDataURL();
      const id = 'img_' + U.hash(data);
      sc.bg = id;
      const privateId = 'img_1111111111111111';
      sc.notes.push({ id: 'private-note', x: 0, y: 0, title: 'Privado', text: privateId });
      Store.setState(Store.state, { [id]: data, [privateId]: data });
      const sound = new File([new Uint8Array(64_000)], 'teste.wav', { type: 'audio/wav' });
      Audio.addFiles([[sound.name, sound]], 'Teste');
      await Net.host('TEST55', options);
      return { id, data, sceneId: sc.id, heroId: hero.id, x: hero.x, y: hero.y, privateId };
    }, options);

    const joinStart = performance.now();
    await Promise.all(players.map((page) => page.evaluate(async (options) => {
      const { Net, Store, UI } = window.App;
      Store.role = 'player';
      UI.start();
      await Net.join('TEST55', options);
    }, options)));
    await Promise.all(players.map((page) => page.waitForFunction(({ id, sceneId }) =>
      window.App.Net.everConnected && window.App.Store.state?.scenes[sceneId] && !!window.App.Store.assets[id], asset)));
    const joinMs = performance.now() - joinStart;
    for (const page of players) {
      const result = await page.evaluate(async ({ id, sceneId, privateId }) => {
        const { Store, Storage } = window.App;
        const image = Store.assets[id];
        return {
          binary: image instanceof Blob || image?.blob instanceof Blob,
          data: (await Storage.campaignBundle()).assets[id],
          privateAsset: Store.assets[privateId],
          notes: Store.state.scenes[sceneId].notes,
        };
      }, asset);
      assert.equal(result.data, asset.data);
      assert.equal(result.binary, !v1Url || page === players[0]);
      assert.equal(result.privateAsset, undefined);
      assert.deepEqual(result.notes, []);
    }

    await players[1].evaluate(({ sceneId, heroId, x, y }) =>
      window.App.Store.dispatch({ type: 'token.move', sceneId, id: heroId, x: x + 70, y }), asset);
    await players[1].waitForFunction(({ sceneId, heroId, x }) => window.App.Store.state.scenes[sceneId].tokens[heroId].x === x, asset);
    assert.equal(await host.evaluate(({ sceneId, heroId }) => window.App.Store.state.scenes[sceneId].tokens[heroId].x, asset), asset.x);

    // Plano 69: o jogador rola e as três telas mostram os mesmos números nos dados 3D
    // Plano 70: em cada tela, quando a mensagem chega, os dados já pararam
    for (const page of [host, ...players]) await page.evaluate(() => {
      window.__diceArrivals = [];
      window.App.Store.on((kind, a) => {
        const D3 = window.App.Dice3D;
        if (kind === 'chat.add' && a?.msg?.dice) window.__diceArrivals.push({ label: a.msg.label, done: !!D3?.last?.done, notation: D3?.last?.notation });
      });
    });
    await players[1].evaluate(() => { window.App.Store.rollPost('3d6', { label: 'Teste de rede' }); });
    const rolled = await host.waitForFunction(() => {
      const m = window.App.Store.state.chat.find((x) => x.label === 'Teste de rede');
      return m && m.dice && m.dice.length === 3 ? m.dice : null;
    }).then((h) => h.jsonValue());
    const want = '1d6+1d6+1d6@' + rolled.map((d) => d.v).join(',');
    for (const page of [host, ...players]) {
      await page.waitForFunction((w) => window.App.Dice3D?.last?.notation === w && window.App.Dice3D.last.done, want, { timeout: 30000 });
      await page.waitForFunction(() => window.__diceArrivals.some((x) => x.label === 'Teste de rede'), null, { timeout: 30000 });
      const arrival = await page.evaluate(() => window.__diceArrivals.find((x) => x.label === 'Teste de rede'));
      assert.deepEqual(arrival, { label: 'Teste de rede', done: true, notation: want });
    }

    const uploadStart = performance.now();
    const uploaded = await players[0].evaluate(({ data }) => {
      const { Net, Store, U } = window.App;
      const image = data.replace('image/png', 'image/octet-stream');
      const id = 'img_' + U.hash(image);
      Store.setState(Store.state, { [id]: image });
      Net.send({ t: 'audio-req', name: 'teste.wav' });
      Net.sendAsset(id, Store.assets[id]);
      const actor = { id: 'actor-from-player', name: 'Novo', kind: 'pc', img: id };
      Store.dispatch({ type: 'actor.add', actor });
      return { id, image };
    }, asset);
    await players[1].waitForFunction(({ id }) => window.App.Store.state.actors['actor-from-player']?.img === id && !!window.App.Store.assets[id], uploaded);
    await players[0].waitForFunction(() => window.App.Audio.urls.has('teste.wav'));
    const uploadAndAudioMs = performance.now() - uploadStart;
    assert.equal(await host.evaluate(async (id) => (await window.App.Storage.campaignBundle()).assets[id], uploaded.id), uploaded.image);

    const reconnectStart = performance.now();
    await players[0].evaluate(() => {
      window.App.Net.everConnected = false;
      window.App.Net.hostConn.close();
    });
    await players[0].waitForFunction(() => window.App.Net.everConnected && window.App.Net.hostConn?.open && window.App.Store.online.length === 3);
    const reconnectMs = performance.now() - reconnectStart;
    assert.equal(await players[0].evaluate(async (id) => (await window.App.Storage.campaignBundle()).assets[id], asset.id), asset.data);

    // Plano 56: código de 32 caracteres e senha da mesa
    const codes = await host.evaluate(() => [window.App.Net.genCode(), window.App.Net.genCode()]);
    for (const code of codes) assert.match(code, /^[A-Za-z0-9]{32}$/);
    assert.notEqual(codes[0], codes[1]);
    await host.evaluate(() => { window.App.Net.password = 'Segredo 56'; });
    const guest = await makePage('player-c');
    const askedFor = (reason) => guest.waitForFunction((reason) =>
      !!document.querySelector('#modal-root .pass-ask')?.textContent.includes(reason), reason);
    const closeAsk = () => guest.evaluate(() => { for (const m of document.querySelectorAll('#modal-root .modal-back')) m.remove(); });
    const noState = async () => {
      const r = await guest.evaluate(() => ({ connected: window.App.Net.everConnected, state: !!window.App.Store.state }));
      assert.deepEqual(r, { connected: false, state: false });
      assert.equal(await host.evaluate(() => !!window.App.Store.state.players['player-c']), false);
    };
    await guest.evaluate(async (options) => {
      const { Net, Store, UI } = window.App;
      Store.role = 'player';
      UI.start();
      await Net.join('TEST55', options);
    }, options);
    await askedFor('Esta mesa tem senha');
    await noState();
    await closeAsk();
    await guest.evaluate(() => window.App.Net.retryWithPass('segredo 56'));
    await askedFor('Senha incorreta');
    await noState();
    await closeAsk();
    await guest.evaluate(() => window.App.Net.retryWithPass('Segredo 56'));
    await guest.waitForFunction(() => window.App.Net.everConnected && !!window.App.Store.state);
    assert.equal(await host.evaluate(() => !!window.App.Store.state.players['player-c']), true);
    // Trocar a senha não derruba quem já está dentro
    await host.evaluate(() => { window.App.Net.password = 'outra'; });
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(await players[0].evaluate(() => window.App.Net.hostConn?.open), true);
    return { joinMs, reconnectMs, uploadAndAudioMs, imageBytes: Buffer.byteLength(asset.data), audioBytes: 64_000,
      clients: players.length, legacyClient: !!v1Url };
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    signaling.kill();
    await terminating;
  }
}
