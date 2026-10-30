import { Node, type Project } from 'ts-morph';
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

/**
 * Renames every identifier named in the table: the declaration, imports and re-exports (barrels), Nest
 * `providers`/`exports` arrays, mock factory keys and every use. Strings and comments stay as they are.
 */
export function renameIdentifiers(project: Project, table: Map<string, string>, input: RewriteInput): string {
  const { file, text } = input;
  if (!mentions(table, text)) return text;
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const edits: { start: number; end: number; value: string }[] = [];
  sf.forEachDescendant((node) => {
    if (!Node.isIdentifier(node)) return;
    const to = table.get(node.getText());
    if (to !== undefined) edits.push({ start: node.getStart(), end: node.getEnd(), value: to });
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
  return `${JSON.stringify(renamed.sort(), null, 2)}\n`;
}
