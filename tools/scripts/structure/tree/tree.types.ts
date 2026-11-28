export interface AllowedDomain {
  features: string[];
  groups: Map<string, string[]>;
}
export type Allowed = Map<string, AllowedDomain>;

export interface FolderCount {
  files: number;
  dirs: number;
}

/** The plan seen from the old tree: file moves, the old files and their folders. */
export interface Moves {
  files: Map<string, string>;
  before: Set<string>;
  folders: Set<string>;
}

/** A path a file reads relative to itself: the source text and how to write a new path there. */
export interface Read {
  rel: string;
  snippet: string;
  put?: (rel: string) => string;
}
