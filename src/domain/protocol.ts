import type { Action, Campaign } from './model';

export const PROTOCOL = 2;
export const ASSET_ID = /^img_[0-9a-f]{16}$/;

export type AssetMessage =
  | { t: 'asset-manifest'; v: 2; ids: string[] }
  | { t: 'asset-request'; v: 2; ids: string[] }
  | { t: 'asset-chunk'; v: 2; id: string; index: number; total: number; digest: string; data: string }
  | { t: 'asset-missing'; v: 2; id: string };

export type SyncMessage =
  | { t: 'hello'; v?: number; playerId: string; name: string; color: string }
  | { t: 'welcome'; v?: number; you: string; state: Campaign; assets?: Record<string, string>; now: number }
  | { t: 'state'; state: Campaign; now: number }
  | { t: 'action'; a: Action }
  | { t: 'asset'; id: string; data: string }
  | { t: 'protocol-error'; v: number }
  | AssetMessage;
