import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AssetTransfer, ASSET_CHUNK } from '../src/services/asset-transfer.ts';
import { splitAsset, joinAsset, ImageUrls } from '../src/services/image-assets.ts';

const digest = (data) => createHash('sha256').update(data).digest('hex').slice(0, 16);
const id = 'img_0000000000000012';

test('imagem com múltiplos blocos chega inteira e passa pela checagem do conteúdo', async () => {
  const expected = 'data:image/webp;base64,' + 'A'.repeat(5 * ASSET_CHUNK);
  const received = await new Promise((resolve) => {
    const receiver = new AssetTransfer({ open: true, send() {} }, digest, (_, data) => resolve(data));
    const sender = new AssetTransfer({ open: true, send(message) { receiver.accept(message); } }, digest, () => {});
    sender.queue(id, splitAsset(expected));
  });
  assert.equal(received, expected);
});

test('bloco adulterado é descartado', () => {
  let received;
  const receiver = new AssetTransfer({ open: true, send() {} }, digest, (_, data) => { received = data; });
  receiver.accept({ t: 'asset-chunk', v: 2, id, index: 0, total: 1, digest: digest('diferente'), data: 'data:image/png;base64,AQ==' });
  assert.equal(received, null);
});

test('Blob de imagem conserva o data URL dos backups', async () => {
  const data = 'data:image/png;base64,AQIDBA==';
  const record = splitAsset(data);
  assert.ok(record.blob instanceof Blob);
  assert.equal(record.blob.type, 'image/png');
  assert.equal(await joinAsset(record), data);
  const old = 'data:image/svg+xml,<svg/>';
  assert.equal(await joinAsset(splitAsset(old)), old);
});

test('URLs são reutilizadas enquanto a imagem pertence à coleção', async () => {
  const urls = new ImageUrls();
  const asset = new Blob(['imagem'], { type: 'image/png' });
  const original = urls.src(id, asset);
  assert.equal(urls.src(id, asset), original);
  urls.retain(new Set([id]));
  assert.equal(await (await fetch(original)).text(), 'imagem');
  urls.retain(new Set());
  await assert.rejects(fetch(original));
});
