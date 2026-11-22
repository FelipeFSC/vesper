export interface RenderView {
  x: number;
  y: number;
  zoom: number;
  dragX: number;
  dragY: number;
}

export interface BoardRenderer<Scene> {
  initialize(): Promise<void>;
  resize(width: number, height: number, resolution: number): void;
  setScene(scene: Scene): void;
  render(view: RenderView): void;
  dispose(): void;
}
