import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const mediaTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

export async function serve(root, base = '/') {
  root = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(root, decodeURIComponent(path.slice(base.length)) || 'index.html');
      const location = relative(root, file);
      const outside = isAbsolute(location) || location.split(sep)[0] === '..';
      if (!path.startsWith(base) || outside || !(await stat(file)).isFile()) throw new Error();
      response.setHeader('Content-Type', mediaTypes[extname(file)] || 'application/octet-stream');
      response.setHeader('Cache-Control', 'public, max-age=300');
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: 'http://127.0.0.1:' + server.address().port + base,
    close: () => new Promise((done) => server.close(done)),
  };
}
