export type ImageAsset = Blob | { prefix: string; blob: Blob } | string;
export type ImageAssets = Record<string, ImageAsset>;

// Preserva o cabeçalho original e o conteúdo dos pacotes legados.
export function splitAsset(data: string): ImageAsset {
  const match = /^data:(image\/[\w.+-]+)(?:;[^,;]+)*;base64,/i.exec(data);
  if (!match) return data;
  try {
    const base64 = data.slice(match[0].length);
    if (base64.length % 4 || /\s/.test(base64)) return data;
    if ((base64.endsWith('==') && !/[AQgw]==$/.test(base64))
      || (!base64.endsWith('==') && base64.endsWith('=') && !/[AEIMQUYcgkosw048]=$/.test(base64))) return data;
    const bytes = typeof Uint8Array.fromBase64 === 'function'
      ? Uint8Array.fromBase64(base64)
      : Uint8Array.from(atob(base64), (byte) => byte.charCodeAt(0));
    return { prefix: match[0], blob: new Blob([bytes], { type: match[1] }) };
  } catch {
    return data;
  }
}

export async function joinAsset(data: ImageAsset): Promise<string> {
  if (typeof data === 'string') return data;
  const blob = data instanceof Blob ? data : data.blob;
  const prefix = data instanceof Blob ? 'data:' + blob.type + ';base64,' : data.prefix;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (typeof bytes.toBase64 === 'function') return prefix + bytes.toBase64();
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return prefix + btoa(text);
}

export const binaryAsset = (data: ImageAsset): ImageAsset => typeof data === 'string' ? splitAsset(data) : data;
export function binaryAssets(assets: ImageAssets): ImageAssets {
  const normalized: ImageAssets = Object.create(null);
  for (const [id, data] of Object.entries(assets)) {
    if (typeof data === 'string' || data instanceof Blob || (typeof data?.prefix === 'string' && data.blob instanceof Blob)) {
      normalized[id] = binaryAsset(data);
    }
  }
  return normalized;
}

export async function encodeAssets(assets: ImageAssets): Promise<Record<string, string>> {
  const encoded: Record<string, string> = Object.create(null);
  for (const [id, data] of Object.entries(assets)) encoded[id] = await joinAsset(data);
  return encoded;
}

export function assetIds(value: unknown): Set<string> {
  return new Set(JSON.stringify(value)?.match(/img_[0-9a-f]{16}/g) || []);
}

export function referencedAssets(value: unknown, assets: ImageAssets): ImageAssets {
  const selected: ImageAssets = Object.create(null);
  for (const id of assetIds(value)) if (Object.hasOwn(assets, id)) selected[id] = assets[id];
  return selected;
}

export function setAsset(assets: ImageAssets, id: string, data: ImageAsset): void {
  assets[id] = binaryAsset(data);
}

// Uma URL por imagem exibida, mantida enquanto o dono da imagem pode usá-la.
export class ImageUrls {
  private readonly urls = new Map<string, { asset: ImageAsset; url: string }>();

  src(id: string, asset: ImageAsset | null | undefined): string | null {
    const previous = this.urls.get(id);
    if (previous && asset === previous.asset) return previous.url;
    this.delete(id);
    if (typeof asset === 'string') return asset;
    if (!asset) return null;
    const url = URL.createObjectURL(asset instanceof Blob ? asset : asset.blob);
    this.urls.set(id, { asset, url });
    return url;
  }

  delete(id: string): void {
    const previous = this.urls.get(id);
    if (!previous) return;
    URL.revokeObjectURL(previous.url);
    this.urls.delete(id);
  }

  retain(ids: ReadonlySet<string>): void {
    for (const id of this.urls.keys()) if (!ids.has(id)) this.delete(id);
  }

  clear(): void {
    for (const id of this.urls.keys()) this.delete(id);
  }
}

export async function withImageUrl<T>(asset: ImageAsset, use: (src: string) => Promise<T>): Promise<T> {
  if (typeof asset === 'string') return use(asset);
  const url = URL.createObjectURL(asset instanceof Blob ? asset : asset.blob);
  try { return await use(url); } finally { URL.revokeObjectURL(url); }
}
