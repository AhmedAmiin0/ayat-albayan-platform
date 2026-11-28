import type { ExportDeclaration, ImportDeclaration } from 'ts-morph';

export interface Binding {
  name: string;
  alias?: string;
  isType: boolean;
}

export interface ModuleRef {
  decl: ImportDeclaration | ExportDeclaration;
  spec: string;
  bindings: Binding[];
  /** Only named bindings, so the declaration can be split or pointed elsewhere by name. */
  named: boolean;
  /** `export * from` (no names): it follows its module as a whole. */
  star: boolean;
}

/** One re-export of a barrel, with the file it reaches. */
export interface BarrelLine {
  target: string;
  bindings: Binding[];
  star: boolean;
}

/** A name a barrel exports and the file that holds it. */
export interface Source {
  file: string;
  name: string;
}
