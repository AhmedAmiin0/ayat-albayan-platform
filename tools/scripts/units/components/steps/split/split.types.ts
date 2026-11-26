import type ts from 'typescript';
import type { HookVerdict } from '../hook/hook.types.ts';

export interface SplitInput {
  /** Repo path of `Name/Name.tsx`. */
  path: string;
  text: string;
  name: string;
  /** Other files of the folder (Name.types.ts, tests, index.ts): path → text. */
  files: Readonly<Record<string, string>>;
  /** Sub-folder names already in `Name/`. */
  subfolders: readonly string[];
  /** Step 5 on the new `Sub/Sub.tsx`: a sub-component with logic splits only with its hook. */
  hook: (path: string, text: string, name: string) => HookVerdict;
}

export type SplitVerdict =
  | { result: 'split'; files: Record<string, string> }
  | { result: 'none' }
  | { result: 'refused'; why: string };

/** What every sub-component of one `Name.tsx` is split against. */
export interface SplitCtx {
  input: SplitInput;
  sf: ts.SourceFile;
  dir: string;
  typesSpec: string;
  locals: ReadonlySet<string>;
}
export interface SubTypes {
  names: string[];
  files: Record<string, string>;
}
/** The type files after the move: the parent's without `names`, the sub's with them. */
export interface TypesMove {
  parent: string;
  sub: string;
}
