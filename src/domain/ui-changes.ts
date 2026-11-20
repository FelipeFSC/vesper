export interface PanelChange {
  chat: boolean;
  sheetIds: Set<string>;
  full: boolean;
}

export function mergePanelChange(change: PanelChange, kind: string, sheetId?: string): void {
  if (kind.startsWith('chat.')) {
    change.chat = true;
  } else if (kind === 'bar.change' || kind === 'actor.bars') {
    if (sheetId) change.sheetIds.add(sheetId);
    if (kind === 'bar.change') change.chat = true;
  } else {
    change.full = true;
  }
}
