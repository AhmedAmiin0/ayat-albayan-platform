import type ts from 'typescript';
import type { TextEdit } from '../../model/model.types.ts';

export interface TypesInput {
  /** Repo path of `Name/Name.tsx`. */
  path: string;
  text: string;
  name: string;
  /** Other files of the folder that the step may read or rewrite: path → text. */
  files: Readonly<Record<string, string>>;
  /** Files outside the folder that import `Name.tsx` by path, and the names they take. */
  outside: readonly { file: string; names: readonly string[] }[];
}

export type TypesVerdict =
  | { result: 'typed'; files: Record<string, string> }
  | { result: 'none' }
  | { result: 'refused'; why: string };
export type TypeDecl = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
/** What the types step adds for the props parameter: the declaration and the parameter edit. */
export interface PropsPlan {
  texts: string[];
  moved: Set<string>;
  edits: TextEdit[];
  nodes: ts.Node[];
}
