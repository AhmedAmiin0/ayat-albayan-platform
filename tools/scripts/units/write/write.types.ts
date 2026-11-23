import type { SpecNode } from '../../ci-checks/move-module/specifiers.ts';

/** A name an importer takes from a unit file. */
export interface NameUse {
  name: string;
  typeOnly: boolean;
}

/** A module path in a file; `names` only for `import { … }` / `export { … } from`. */
export interface SpecUse extends SpecNode {
  names?: NameUse[];
}

/** How importers spell paths: no extension, the file's own (`.ts`), or `.js` for a `.ts` file. */
export type ExtStyle = 'bare' | 'exact' | 'js';

/** What a unit's index.ts must re-export: file (repo path, once moved) → name → type-only. */
export interface BarrelUse {
  files: Map<string, Map<string, boolean>>;
  style: ExtStyle;
}

/** A string edit: replace text[start, end) with value. */
export interface Edit {
  start: number;
  end: number;
  value: string;
}

export interface RepoMove {
  root: string;
  /** Old path → new path of every moved file. */
  renamed: ReadonlyMap<string, string>;
  /** Old path → its unit's new folder, for units that get an index.ts. */
  homes: ReadonlyMap<string, string>;
}

/** What `--write` did, for its report. */
export interface Applied {
  moved: number;
  rewritten: number;
  barrels: string[];
  json: string[];
}
