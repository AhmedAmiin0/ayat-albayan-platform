import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { ts } from 'ts-morph';

/** A tsconfig `paths` alias such as `@/*` → `apps/web/src/*`, valid for files under `scope`. */
export interface Alias {
  prefix: string;
  dir: string;
  scope: string;
}
/** How a specifier reached its file, so the rewritten one keeps the same style. */
export type Style = 'exact' | 'js' | 'bare' | 'index';
export interface Target {
  file: string;
  style: Style;
  alias?: Alias;
  /** The extension the specifier wrote for `js` style (`.js` for a `.ts` file). */
  written?: string;
}
export interface Resolver {
  root: string;
  aliases: Alias[];
  /** Old paths of every file a move map renames: they resolve even when the file is already gone. */
  renamed: Map<string, string>;
}

const EXTS = ['.ts', '.tsx', '.mts', '.cts', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const JS_TO_TS: Record<string, string[]> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

function aliasesOf(root: string, scope: string): Alias[] {
  const file = posix.join(root, scope, 'tsconfig.json');
  if (!existsSync(file)) return [];
  const { config } = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
  const opts = (config?.compilerOptions ?? {}) as { baseUrl?: string; paths?: Record<string, string[]> };
  return Object.entries(opts.paths ?? {}).flatMap(([key, targets]) => {
    const target = targets[0];
    if (!key.endsWith('/*') || target === undefined || !target.endsWith('/*')) return [];
    const dir = posix.join(scope, opts.baseUrl ?? '.', target.slice(0, -2));
    return [{ prefix: key.slice(0, -1), dir, scope }];
  });
}

/** The `paths` aliases of every app and package tsconfig. */
export function loadAliases(root: string): Alias[] {
  return ['apps', 'packages', 'tools'].flatMap((group) => {
    if (!existsSync(posix.join(root, group))) return [];
    return readdirSync(posix.join(root, group)).flatMap((n) => aliasesOf(root, posix.join(group, n)));
  });
}

const under = (file: string, dir: string): boolean => file === dir || file.startsWith(`${dir}/`);

function isFile(r: Resolver, rel: string): boolean {
  if (r.renamed.has(rel)) return true;
  const abs = posix.join(r.root, rel);
  return existsSync(abs) && statSync(abs).isFile();
}

function lookup(r: Resolver, base: string): Omit<Target, 'alias'> | undefined {
  if (isFile(r, base)) return { file: base, style: 'exact' };
  const ext = posix.extname(base);
  for (const tsExt of JS_TO_TS[ext] ?? []) {
    const file = base.slice(0, -ext.length) + tsExt;
    if (isFile(r, file)) return { file, style: 'js', written: ext };
  }
  for (const e of EXTS) if (isFile(r, base + e)) return { file: base + e, style: 'bare' };
  for (const e of EXTS) if (isFile(r, `${base}/index${e}`)) return { file: `${base}/index${e}`, style: 'index' };
  return undefined;
}

/** The repo file a specifier in `from` points at; undefined for packages and unknown paths. */
export function resolveSpec(r: Resolver, from: string, spec: string): Target | undefined {
  if (spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..') {
    return lookup(r, posix.normalize(posix.join(posix.dirname(from), spec)).replace(/\/$/, ''));
  }
  const alias = r.aliases.find((a) => spec.startsWith(a.prefix) && under(from, a.scope));
  if (alias === undefined) return undefined;
  const found = lookup(r, posix.join(alias.dir, spec.slice(alias.prefix.length)));
  return found && { ...found, alias };
}

const stripExt = (file: string): string =>
  file.endsWith('.d.ts') ? file.slice(0, -5) : file.slice(0, -posix.extname(file).length);

function pathFor(target: Target, file: string): string {
  if (target.style === 'exact') return file;
  if (target.style === 'js') return stripExt(file) + (target.written ?? '.js');
  if (target.style === 'index' && posix.basename(file).startsWith('index.')) return posix.dirname(file);
  return stripExt(file);
}

/** The specifier `from` (its new path) should write for `target` once it lives at `file`. */
export function formatSpec(target: Target, opts: { from: string; file: string }): string {
  const path = pathFor(target, opts.file);
  const { alias } = target;
  if (alias !== undefined && under(opts.from, alias.scope) && under(path, alias.dir)) {
    return alias.prefix + posix.relative(alias.dir, path);
  }
  const rel = posix.relative(posix.dirname(opts.from), path);
  if (rel === '') return '.';
  return rel.startsWith('.') ? rel : `./${rel}`;
}
