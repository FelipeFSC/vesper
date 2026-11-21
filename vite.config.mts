import { cp, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

function localResources(): Plugin {
  return {
    name: 'vesper-local-resources',
    apply: 'build',
    async writeBundle({ dir }) {
      if (!dir) return;
      await Promise.all(['data', 'imagens', 'Sons', 'wiki'].map(async (path) => {
        try {
          if (!(await stat(path)).isDirectory()) return;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
          throw error;
        }
        await cp(path, resolve(dir, path), { recursive: true });
      }));
      const licenses = resolve(dir, 'licenses');
      await mkdir(licenses, { recursive: true });
      await Promise.all(['eb-garamond', 'inter'].map((font) =>
        cp('node_modules/@fontsource/' + font + '/LICENSE', resolve(licenses, font + '.txt'))));
    },
  };
}

export default defineConfig({
  base: './',
  appType: 'mpa',
  publicDir: false,
  plugins: [svelte(), localResources()],
  build: {
    rolldownOptions: {
      input: ['index.html', 'ficha.html', 'cadastros.html'],
    },
  },
});
