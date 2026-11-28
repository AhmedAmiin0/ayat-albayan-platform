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

/** One re-export of a barrel: the file it reaches (`pkg:<name>` for a package) and its span. */
export interface BarrelLine {
  target: string;
  bindings: Binding[];
  star: boolean;
  start: number;
  end: number;
}

/** A barrel the plan prunes: the re-exports that leave its feature, by line and by name. */
export interface Pruned {
  foreign: BarrelLine[];
  names: Map<string, Source>;
  /** Some statement stays, so the barrel is kept. */
  kept: boolean;
  /** The package a deleted barrel re-exported whole, for names no line explains. */
  external?: string;
}

/** A name a barrel exports and the file that holds it. */
export interface Source {
  file: string;
  name: string;
  /** Re-exported with `type` only: a value import cannot use it. */
  typeOnly?: boolean;
}
