import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { scenarios } from './fixtures.mjs';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
const args = process.argv.slice(2);
const probe = args.includes('--context');
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ channel: process.env.VESPER_BROWSER || 'chrome', args: ['--enable-unsafe-swiftshader'] });
  const results = [];
  for (const name of probe ? ['pequeno'] : Object.keys(scenarios)) for (const dpr of probe ? [1] : [1, 2]) {
    for (let run = 1; run <= (probe ? 1 : 3); run++) for (const backend of probe ? ['pixi'] : ['canvas', 'pixi']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
      try {
        await page.goto('http://127.0.0.1:' + address.port + '/benchmarks/renderers.html');
        await page.waitForFunction(() => window.measureRenderer);
        const stats = await page.evaluate((args) => window.measureRenderer(...args), [name, backend, dpr, probe]);
        results.push({ name, dpr, run, backend, ...stats });
      } catch (error) {
        results.push({ name, dpr, run, backend, error: error.message });
      } finally {
        await page.close();
      }
    }
    console.log(name, 'DPR', dpr);
  }
  const output = args.find((arg) => !arg.startsWith('--')) || (probe ? 'benchmarks/contexto.local.json' : 'benchmarks/pixi.local.json');
  await writeFile(output, JSON.stringify({ browser: browser.version(), results }, null, 2) + '\n');
} finally {
  await browser?.close();
  await server.close();
}
