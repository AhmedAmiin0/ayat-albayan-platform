import type ts from 'typescript';
import type { Inputs } from './inputs.ts';

export interface HookInput {
  /** Repo path of `Name/Name.tsx`. */
  path: string;
  text: string;
  name: string;
  /** File names in the component's folder. */
  folder: readonly string[];
  /** Q2: a test covers the component before its logic moves. */
  tested: boolean;
}

export type HookVerdict =
  | { result: 'hooked'; files: Record<string, string> }
  | { result: 'no-hook' }
  | { result: 'done' }
  | { result: 'refused'; why: string };

/** Everything the two files are written from, after the refs and hoists passes. */
export interface Shape {
  sf: ts.SourceFile;
  fn: ts.FunctionLikeDeclaration;
  statement: ts.Statement;
  setup: ts.Statement[];
  theme: ts.Statement | undefined;
  /** `const x = useX(…);` lines and the calls they came from (in the refs-renamed text). */
  hoists: { name: string; text: string; call: ts.Node }[];
  guards: ts.Statement[];
  ret: ts.Expression;
  moved: ts.Statement[];
  outputs: string[];
  inputs: Inputs;
}
