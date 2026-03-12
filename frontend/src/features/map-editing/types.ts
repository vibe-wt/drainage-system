export type EditMode =
  | "idle"
  | "create-manhole"
  | "create-pipe"
  | "create-plot"
  | "move-manhole"
  | "reshape-pipe"
  | "reshape-plot";

export interface ManholeDraft {
  coordinates: [number, number] | null;
}

export interface PipeDraft {
  coordinates: [number, number][];
  snappedManholeIds: (string | null)[];
  isComplete: boolean;
}

export interface PlotDraft {
  coordinates: [number, number][];
}
