export interface RouteMapDiff {
  /** Walked id routes the map does not list. */
  unmapped: string[];
  /** Listed routes no controller serves any more. */
  stale: string[];
}
