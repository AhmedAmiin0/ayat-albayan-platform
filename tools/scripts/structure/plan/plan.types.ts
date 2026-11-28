export interface Rule {
  from: string;
  to: string;
  /** Position in map.json, for messages. */
  index: number;
  /** Specificity: a file beats a glob, a glob beats its folder, a deeper folder a shallower one. */
  weight: number;
  match: (file: string) => string | undefined;
}

export interface Plan {
  /** `[from, to]` for every file that moves, sorted by source. */
  pairs: [string, string][];
  /** Parent barrels removed by the plan. */
  drops: string[];
  problems: string[];
}
