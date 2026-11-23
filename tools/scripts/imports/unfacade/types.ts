import type { ExportDeclaration, ImportDeclaration } from 'ts-morph';

export type Decl = ImportDeclaration | ExportDeclaration;

/** One named import or export-from: `{ text: 'type A as B', name: 'A', alias: 'B' }` each. */
export interface Named {
  decl: Decl;
  keyword: 'import' | 'export';
  typeOnly: boolean;
  spec: string;
  elements: { text: string; name: string; alias?: string }[];
}

/** The element texts a statement keeps, and those moving to each other specifier. */
export interface Route {
  stay: string[];
  moved: [string, string[]][];
}

export type Kept = 'same' | 'manual' | 'overCap';

export type FilePlan = { kind: Kept } | { kind: 'change'; text: string; owners: string[] };

export interface PlanInput {
  path: string;
  text: string;
  owners: ReadonlyMap<string, string>;
}

export interface RunOptions {
  root: string;
  workspace: string;
  write: boolean;
  next?: number;
  owner?: string;
}

export interface RunReport {
  toChange: string[];
  done: string[];
  overCap: string[];
  manual: string[];
  deps: string[];
}

/** One re-exported name: what to import instead, and from where. */
export interface ShimName {
  source: string;
  spec: string;
  type: boolean;
}

export interface Shim {
  path: string;
  names: Map<string, ShimName>;
  decls: Named[];
  statements: number;
}

export interface ReadCtx {
  root: string;
  read: (path: string) => string;
}

export interface FileRefs {
  imports: { named: Named; target: string }[];
  pinned: string[];
  mocked: string[];
}

export interface ShimReport {
  shims: string[];
  repointed: string[];
  overCap: string[];
  deleted: string[];
  kept: string[];
  manual: string[];
  deps: string[];
}
