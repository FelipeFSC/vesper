import { ASSET_ID, PROTOCOL, type AssetMessage } from '../domain/protocol.ts';
import { joinAsset, type ImageAsset } from './image-assets.ts';

export const ASSET_CHUNK = 16_000;
const maxSize = 24 * 1024 * 1024;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Connection {
  open: boolean;
  bufferSize?: number;
  dataChannel?: { bufferedAmount: number };
  send(message: AssetMessage): void;
}

interface Receive {
  parts: string[];
  total: number;
  digest: string;
  timer: ReturnType<typeof setTimeout>;
}

export class AssetTransfer {
  private readonly outgoing = new Map<string, ImageAsset>();
  private readonly incoming = new Map<string, Receive>();
  private running = false;
  private closed = false;
  private readonly connection: Connection;
  private readonly hash: (data: string) => string;
  private readonly receive: (id: string, data: string | null) => void;

  constructor(
    connection: Connection,
    hash: (data: string) => string,
    receive: (id: string, data: string | null) => void,
  ) {
    this.connection = connection;
    this.hash = hash;
    this.receive = receive;
  }

  queue(id: string, data: ImageAsset | undefined): void {
    if (this.closed || !this.connection.open || !ASSET_ID.test(id)) return;
    const size = !data ? 0 : typeof data === 'string' ? data.length
      : (data instanceof Blob ? data.type.length + 13 : data.prefix.length)
        + 4 * Math.ceil((data instanceof Blob ? data.size : data.blob.size) / 3);
    if (!data || !size || size > maxSize || this.outgoing.size >= 128) {
      this.connection.send({ t: 'asset-missing', v: PROTOCOL, id });
      return;
    }
    if (!this.outgoing.has(id)) this.outgoing.set(id, data);
    if (!this.running) void this.send();
  }

  accept(message: Extract<AssetMessage, { t: 'asset-chunk' | 'asset-missing' }>): void {
    const { id } = message;
    if (this.closed || message.v !== PROTOCOL || !ASSET_ID.test(id)) return;
    if (message.t === 'asset-missing') { this.finish(id, null); return; }
    const { data, index, total, digest } = message;
    if (!Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total
      || total > Math.ceil(maxSize / ASSET_CHUNK) || typeof data !== 'string' || !data.length
      || data.length > ASSET_CHUNK || (index < total - 1 && data.length !== ASSET_CHUNK)
      || !/^[0-9a-f]{16}$/.test(digest)) return;
    let current = this.incoming.get(id);
    if (!current && index === 0 && this.incoming.size < 2) {
      current = { parts: [], total, digest, timer: setTimeout(() => this.finish(id, null), 60_000) };
      this.incoming.set(id, current);
    }
    if (!current || current.parts.length !== index || current.total !== total || current.digest !== digest) {
      if (current) this.finish(id, null);
      return;
    }
    current.parts.push(data);
    if (current.parts.length === total) {
      const image = current.parts.join('');
      this.finish(id, image.length <= maxSize && image.startsWith('data:image/') && this.hash(image) === digest ? image : null);
    }
  }

  close(): void {
    this.closed = true;
    this.outgoing.clear();
    for (const value of this.incoming.values()) clearTimeout(value.timer);
    this.incoming.clear();
  }

  retainOutgoing(allowed: ReadonlySet<string>): void {
    for (const id of this.outgoing.keys()) if (!allowed.has(id)) this.outgoing.delete(id);
  }

  discardIncoming(id: string): void {
    const current = this.incoming.get(id);
    if (current) clearTimeout(current.timer);
    this.incoming.delete(id);
  }

  private finish(id: string, data: string | null): void {
    this.discardIncoming(id);
    this.receive(id, data);
  }

  private async send(): Promise<void> {
    this.running = true;
    try {
      for (const [id, asset] of this.outgoing) {
        const data = await joinAsset(asset);
        if (this.closed || !this.connection.open) { this.close(); return; }
        if (this.outgoing.get(id) !== asset) continue;
        if (!data.startsWith('data:image/') || data.length > maxSize) {
          this.connection.send({ t: 'asset-missing', v: PROTOCOL, id });
          this.outgoing.delete(id);
          continue;
        }
        const total = Math.ceil(data.length / ASSET_CHUNK), digest = this.hash(data);
        for (let index = 0; index < total; index++) {
          if (this.outgoing.get(id) !== asset) break;
          const deadline = Date.now() + 15_000;
          while (!this.closed && this.connection.open && this.outgoing.get(id) === asset
            && ((this.connection.dataChannel?.bufferedAmount ?? 0) > 128_000 || (this.connection.bufferSize ?? 0) > 4)) {
            if (Date.now() >= deadline) {
              this.connection.send({ t: 'asset-missing', v: PROTOCOL, id });
              break;
            }
            await wait(12);
          }
          if (this.closed || !this.connection.open) { this.close(); return; }
          if (this.outgoing.get(id) !== asset || Date.now() >= deadline) break;
          const offset = index * ASSET_CHUNK;
          this.connection.send({ t: 'asset-chunk', v: PROTOCOL, id, index, total, digest, data: data.slice(offset, offset + ASSET_CHUNK) });
          // Cede a thread a ações e áudio mesmo quando o buffer da conexão está vazio.
          if (index % 4 === 3) await wait(0);
        }
        if (this.outgoing.get(id) === asset) this.outgoing.delete(id);
      }
    } catch (error) {
      this.close();
      console.warn('Transferência de imagem interrompida', error);
    } finally {
      this.running = false;
    }
  }
}
