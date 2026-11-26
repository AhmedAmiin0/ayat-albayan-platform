import type ts from 'typescript';

export type ComponentFn = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration;
/** A top-level component: its name, its function, whether a call wraps it, its statement. */
export interface Component {
  name: string;
  fn: ComponentFn;
  wrapped: boolean;
  statement: ts.Statement;
}
/** A text edit: replace text[start, end) with value. */
export interface TextEdit {
  start: number;
  end: number;
  value: string;
}
/** One import declaration, reduced to what a file can re-emit for a subset of its names. */
export interface ImportDecl {
  spec: string;
  typeOnly: boolean;
  sideEffect: boolean;
  defaultName?: string;
  namespace?: string;
  named: { local: string; text: string; typeOnly: boolean }[];
}
/** A component body as `S` (setup), `G` (guards) and `R` (the final return's expression). */
export interface Parts {
  setup: ts.Statement[];
  guards: ts.IfStatement[];
  ret: ts.Expression | undefined;
  /** A statement after the first guard that is not a guard («narrowing after guard»). */
  stray: ts.Statement | undefined;
}
/** Where moved names now live: name → repo path without extension. */
export type Moved = ReadonlyMap<string, string>;
/** A step's value, or why it stopped. */
export type Result<T> = { ok: true; value: T } | { ok: false; why: string };
