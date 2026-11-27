/** A call in source, or a test file's kit mocks. */
export type RowKind = 'call' | 'test';

/** One line of the report: a call or a test file, rewritten or left with its reason. */
export interface Row {
  path: string;
  line: number;
  kind: RowKind;
  result: 'rewritten' | 'left' | 'excluded';
  reason: string;
}

export interface SourceFile {
  path: string;
  text: string;
}

export interface Planned {
  rows: Row[];
  files: Map<string, string>;
}

export interface ApiOneIo {
  root: string;
  cwd: string;
  log: (line: string) => void;
  /** Formats the written files; default oxlint's class-A fixes and oxfmt. */
  format?: (root: string, paths: string[]) => void;
}
