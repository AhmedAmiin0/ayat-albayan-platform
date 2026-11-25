import ts from 'typescript';
import type { Component } from '../../model/components.ts';
import type { TextEdit } from '../../model/edits.ts';

/** What the types step adds for the props parameter: the declaration and the parameter edit. */
export interface PropsPlan {
  texts: string[];
  moved: Set<string>;
  edits: TextEdit[];
  nodes: ts.Node[];
}

const EMPTY: PropsPlan = { texts: [], moved: new Set(), edits: [], nodes: [] };

const rootName = (type: ts.TypeReferenceNode, sf: ts.SourceFile): string =>
  type.typeName.getText(sf).split('.')[0] ?? '';

/** A type from elsewhere (a package's `CellProps<Row>`), not one the folder already names. */
const isForeign = (
  type: ts.TypeNode,
  at: { sf: ts.SourceFile; local: ReadonlySet<string> },
): boolean => ts.isTypeReferenceNode(type) && !at.local.has(rootName(type, at.sf));

const declarationOf = (type: ts.TypeNode, props: string, sf: ts.SourceFile): string =>
  ts.isTypeLiteralNode(type)
    ? `export interface ${props} ${type.getText(sf)}`
    : `export type ${props} = ${type.getText(sf)};`;

/** The props parameter's type: an inline literal or a foreign type becomes `NameProps`. */
export function propsPlan(
  c: Component,
  at: { sf: ts.SourceFile; local: ReadonlySet<string> },
): PropsPlan {
  const type = c.fn.parameters[0]?.type;
  const props = `${c.name}Props`;
  if (type === undefined || at.local.has(props)) return EMPTY;
  if (!ts.isTypeLiteralNode(type) && !isForeign(type, at)) return EMPTY;
  const edit = { start: type.getStart(at.sf), end: type.getEnd(), value: props };
  return {
    texts: [declarationOf(type, props, at.sf)],
    moved: new Set([props]),
    edits: [edit],
    nodes: [type],
  };
}
