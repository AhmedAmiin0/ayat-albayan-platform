import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';

const SKIP = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.turbo', '.expo', '.git', 'android', 'ios',
  'playwright-report', 'test-results', 'supabase',
]);
const CODE = /\.[cm]?[jt]sx?$/;
const TEXT = /\.(md|ya?ml|json)$/;
/** Never rewritten: the plan (it names the source paths on purpose), the move maps, generated lockfiles. */
const TEXT_KEEP = [/^docs\/27-refactor-plan\.md$/, /^refactor\/moves\//, /(^|\/)pnpm-lock\.yaml$/, /(^|\/)package\.json$/];

function walk(root: string, dir: string, keep: RegExp): string[] {
  const abs = dir === '' ? root : posix.join(root, dir);
  return readdirSync(abs, { withFileTypes: true }).flatMap((d) => {
    const rel = dir === '' ? d.name : posix.join(dir, d.name);
    if (d.isDirectory()) return SKIP.has(d.name) || (dir === '' && d.name.startsWith('.') && d.name !== '.github') ? [] : walk(root, rel, keep);
    return keep.test(d.name) ? [rel] : [];
  });
}

/** Every code file of the monorepo: apps, packages, tools, e2e and the root config files. */
export const codeFiles = (root: string): string[] => walk(root, '', CODE);

/** Docs, workflows and JSON/YAML configs that may name a moved file by its repo path. */
export const textFiles = (root: string): string[] =>
  walk(root, '', TEXT).filter((f) => !TEXT_KEEP.some((re) => re.test(f)));

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replaces whole repo paths (`apps/api/src/env.ts`) with their new path. */
export function rewriteText(text: string, pairs: [string, string][]): string {
  return pairs.reduce(
    (acc, [from, to]) => acc.replace(new RegExp(`(?<![\\w./-])${escape(from)}(?![\\w-]|\\.\\w)`, 'g'), to),
    text,
  );
}

export function readText(root: string, file: string): string {
  return readFileSync(posix.join(root, file), 'utf8');
}

export function writeIfChanged(root: string, file: string, text: string): boolean {
  const abs = posix.join(root, file);
  if (existsSync(abs) && readFileSync(abs, 'utf8') === text) return false;
  mkdirSync(posix.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  return true;
}

function pruneEmpty(root: string, dir: string): void {
  let d = dir;
  while (d !== '.' && d !== '' && existsSync(posix.join(root, d)) && readdirSync(posix.join(root, d)).length === 0) {
    rmdirSync(posix.join(root, d));
    d = posix.dirname(d);
  }
}

/** Renames the files on disk (git sees renames) and removes the folders they leave empty. */
export function moveFiles(root: string, pairs: [string, string][]): void {
  for (const [from, to] of pairs) {
    if (existsSync(posix.join(root, to))) throw new Error(`${to} already exists`);
    mkdirSync(posix.dirname(posix.join(root, to)), { recursive: true });
    renameSync(posix.join(root, from), posix.join(root, to));
  }
  for (const [from] of pairs) pruneEmpty(root, posix.dirname(from));
}
