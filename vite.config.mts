import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cp, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

// Versão mostrada no rodapé do menu: número do CHANGELOG + commit exato (+ aviso se há alterações não salvas no git).
function buildLabel(): string {
  let version = '?';
  try { version = /^## ([\d.]+)/m.exec(readFileSync('.claude/CHANGELOG.md', 'utf8'))?.[1] || '?'; } catch { /* sem changelog */ }
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    return `${version} · ${hash}${dirty ? ' · com alterações locais' : ''}`;
  } catch { return version; }
}

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
      // Plano 69: sons dos dados 3D (só os usados: dado de plástico, moeda e mesa de feltro)
      const dice = 'node_modules/@3d-dice/dice-box-threejs/';
      await cp(dice + 'public/sounds', resolve(dir, 'dados3d/sounds'), {
        recursive: true,
        filter: (src) => !/\.mp3$/i.test(src) || /dicehit_plastic|dicehit_coin|surface_felt/i.test(src),
      });
      await cp(dice + 'LICENSE', resolve(licenses, 'dice-box-threejs.txt'));
    },
  };
}

export default defineConfig({
  base: './',
  appType: 'mpa',
  publicDir: false,
  plugins: [svelte(), localResources()],
  define: { __VESPER_BUILD__: JSON.stringify(buildLabel()) },
  build: {
    rolldownOptions: {
      input: ['index.html', 'ficha.html', 'cadastros.html'],
    },
  },
});
