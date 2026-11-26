import type { Step } from './args.schemas.ts';

/** What the steps learn from the repo: tests that render a component, path importers. */
export interface RepoContext {
  read: (path: string) => string;
  tested: (name: string, ws: string) => boolean;
  importers: (path: string) => { file: string; names: string[] }[];
  /** Every file that imports `path`, its own folder included. */
  users: (path: string) => string[];
  resolve: (from: string, spec: string) => string | undefined;
  /** The specifier `from` writes for `file`: relative, or the app alias instead of `../`. */
  specFor: (from: string, file: string) => string;
}
export interface Target {
  path: string;
  name: string;
  ws: string;
}
/** One TSV line of the report: what a step did to a component. */
export interface Row {
  path: string;
  step: Step | 'exclude';
  result: string;
  reason: string;
}
export interface Planned {
  rows: Row[];
  files: Map<string, string>;
  /** Files an adopted hook moved away from. */
  deleted: Set<string>;
}
export interface ComponentsIo {
  root: string;
  cwd: string;
  log: (line: string) => void;
  /** Formats written files; oxlint class-A fixes and oxfmt unless a test passes its own. */
  format?: (root: string, paths: string[]) => void;
}
export type PlanContext = RepoContext & {
  names: (dir: string) => string[];
  subfolders: (dir: string) => string[];
  excludes: ReadonlyMap<string, string>;
};
/** What one step did: `typed`, `hooked`, `unchanged`, `no-hook` or `refused` (with why). */
export interface Outcome {
  result: string;
  why: string;
  files: Record<string, string>;
  deleted: string[];
}
export type Overlay = Map<string, string>;
