import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve } from '../tests/serve.mjs';

const root = process.argv[2] || 'dist';
const server = await serve(root);
let browser;
try {
  browser = await chromium.launch({ channel: process.env.VESPER_BROWSER || 'chrome' });
  const rows = [];
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', { urls: ['https://*'] });
      for (const cache of ['frio', 'quente']) {
        await page.goto(server.url + 'cadastros.html?perf');
        await page.waitForFunction(() => window.App?.Cadastros?.loaded);
        const row = await page.evaluate(async () => {
          const frame = () => new Promise(requestAnimationFrame);
          await frame();
          const readyMs = performance.now();
          const allRows = document.querySelectorAll('.cd-item').length;
          const input = document.querySelector('.cd-search'), list = document.querySelector('#cd-list');
          const query = document.querySelector('.cd-item-top b').textContent.split(' ')[0];
          const start = performance.now();
          const change = new Promise((resolve) => {
            const observer = new MutationObserver(() => { observer.disconnect(); resolve(performance.now()); });
            observer.observe(list, { childList: true, subtree: true, characterData: true });
          });
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const updated = await change;
          localStorage.removeItem('vesper-cadastros-ui');
          const last = (name) => performance.getEntriesByName(name).at(-1)?.duration;
          return {
            readyMs, allRows, query, filterToDomMs: updated - start,
            filterMs: last('cadastros.filtro'), readMs: last('cadastros.leitura'),
            updatedRows: document.querySelectorAll('.cd-item').length,
          };
        });
        rows.push({ run, cache, ...row });
      }
    } finally {
      await context.close();
    }
  }
  await writeFile(process.argv[3] || 'benchmarks/catalogo.local.json', JSON.stringify({ browser: browser.version(), rows }, null, 2) + '\n');
} finally {
  await browser?.close();
  await server.close();
}
