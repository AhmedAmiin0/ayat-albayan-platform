import { Node, type Project, type SourceFile } from 'ts-morph';
import type { RewriteInput } from './rewrite.ts';
import { applyEdits } from './specifiers.ts';

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** The map's `renames` as a checked table: identifiers only, no chains (`A→B, B→C`), no two olds to one new. */
export function renameTable(renames: Record<string, string> | undefined): Map<string, string> {
  const table = new Map(Object.entries(renames ?? {}));
  const news = new Set<string>();
  for (const [from, to] of table) {
    if (!IDENT.test(from) || !IDENT.test(to) || from === to) throw new Error(`bad rename ${from} → ${to}`);
    if (table.has(to)) throw new Error(`rename chain through ${to}`);
    if (news.has(to)) throw new Error(`two renames to ${to}`);
    news.add(to);
  }
  return table;
}

const escape = (s: string): string => s.replace(/\$/g, '\\$');

/** Whether the text holds one of the old names as a whole word (skips parsing the rest). */
export function mentions(table: Map<string, string>, text: string): boolean {
  if (table.size === 0) return false;
  return new RegExp(`(?<![\\w$])(?:${[...table.keys()].map(escape).join('|')})(?![\\w$])`).test(text);
}

/** Workspace specifiers a renamed name may come from; any other bare package keeps its own names. */
const OWN = /^(\.|@\/|@ab\/)/;

/** Refuses a file whose rename would collide (the new name is there already) or reach a package import. */
function guard(sf: SourceFile, table: Map<string, string>, ids: Node[]): void {
  const file = sf.getFilePath();
  const names = new Set(ids.map((n) => n.getText()));
  const clash = [...table].find(([from, to]) => names.has(from) && names.has(to));
  if (clash !== undefined) throw new Error(`${file}: ${clash[1]} already exists, rename refused`);
  for (const decl of sf.getImportDeclarations()) {
    if (OWN.test(decl.getModuleSpecifierValue())) continue;
    const hit = decl.getNamedImports().map((n) => n.getName()).find((n) => table.has(n));
    if (hit !== undefined) throw new Error(`${file}: ${hit} comes from ${decl.getModuleSpecifierValue()}, rename refused`);
  }
}

/**
 * Renames every identifier named in the table: the declaration, imports and re-exports (barrels), Nest
 * `providers`/`exports` arrays, mock factory keys and every use, matched by name (the table holds unique class
 * names). Strings and comments stay as they are. A file that already has the new name, or imports an old one
 * from a non-workspace package, stops the run.
 */
export function renameIdentifiers(project: Project, table: Map<string, string>, input: RewriteInput): string {
  const { file, text } = input;
  if (!mentions(table, text)) return text;
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const ids = sf.getDescendants().filter((n) => Node.isIdentifier(n));
  guard(sf, table, ids);
  const edits = ids.flatMap((node) => {
    const to = table.get(node.getText());
    return to === undefined ? [] : [{ start: node.getStart(), end: node.getEnd(), value: to }];
  });
  project.removeSourceFile(sf);
  return edits.length === 0 ? text : applyEdits(text, edits);
}

/** `refactor/guards/knip.json` lines (`<path> exports|types <Name>`) follow the renamed names, kept sorted. */
export function renameGuardNames(table: Map<string, string>, text: string): string {
  const lines = JSON.parse(text) as string[];
  const renamed = lines.map((line) => {
    const at = line.lastIndexOf(' ');
    const to = table.get(line.slice(at + 1));
    return to === undefined ? line : `${line.slice(0, at + 1)}${to}`;
  });
  return `${JSON.stringify([...new Set(renamed)].sort(), null, 2)}\n`;
}
