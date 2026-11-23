export interface BaselineDiff {
  /** Walked id routes the baseline does not list. */
  added: string[];
  /** Listed routes no controller serves any more. */
  stale: string[];
}
