export interface Identity {
  id: string;
  name: string;
  color: string;
}

export interface Bar {
  name: string;
  value: number;
  max: number;
}

export interface Actor extends Identity {
  kind: 'pc' | 'npc' | 'monster';
  owner?: string;
  img?: string | null;
  bars?: Bar[];
  sistema?: 'generico' | '5e';
}

export interface Token {
  id: string;
  actorId?: string | null;
  owner?: string;
  x: number;
  y: number;
  size?: number;
  hidden?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  cols: number;
  rows: number;
  grid: number;
  tokens: Record<string, Token>;
  wallsV: number;
}

export interface Campaign {
  name: string;
  activeSceneId: string | null;
  gm: Identity;
  scenes: Record<string, Scene>;
  actors: Record<string, Actor>;
  playerScenes: Record<string, string>;
}

export interface Action {
  type: string;
  by?: string;
  sceneId?: string;
  id?: string;
}
