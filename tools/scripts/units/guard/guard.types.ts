/** Folder → floating units in it (refactor/guards/units.json). */
export type UnitCounts = Record<string, number>;

export interface GuardIo {
  root: string;
  log: (line: string) => void;
}
