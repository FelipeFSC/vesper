export const resolutions = [
  ['auto', 'Automático (até 2×)'],
  ['economy', 'Econômico (1×)'],
  ['native', 'Nativo'],
] as const;

const key = 'vespera.board-resolution';
type Resolution = typeof resolutions[number][0];
let current: Resolution = 'auto';
try {
  const saved = localStorage.getItem(key);
  if (saved === 'economy' || saved === 'native') current = saved;
} catch { /* Preferência opcional quando o navegador bloqueia armazenamento. */ }

export const resolution = () => current;

export function setResolution(value: string): void {
  if (value !== 'economy' && value !== 'native' && value !== 'auto') return;
  current = value;
  try { localStorage.setItem(key, value); } catch { /* Continua valendo nesta aba. */ }
}

export function boardDpr(native: number): number {
  if (current === 'economy') return 1;
  return current === 'native' ? native : Math.min(2, native);
}
