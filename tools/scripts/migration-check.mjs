// Read-only migration check for db-migrate.yml: numbering and a light SQL sanity lint.
// Usage: node tools/scripts/migration-check.mjs [baseRef]   (baseRef: e.g. origin/develop)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DIR = 'packages/db/supabase/migrations';
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;

// Strips comments, quoted strings and dollar-quoted bodies so only structure is left.
export function stripSql(sql) {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, 'BODY')
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:[^']|'')*'/g, 'STR');
}

export function lintSql(name, sql) {
  const errors = [];
  if (!sql.trim()) return [`${name}: empty file`];
  const body = stripSql(sql);
  const open = (body.match(/\(/g) ?? []).length;
  const close = (body.match(/\)/g) ?? []).length;
  if (open !== close) errors.push(`${name}: unbalanced parentheses (${open} open, ${close} close)`);
  if (body.includes('$')) errors.push(`${name}: unterminated dollar-quoted string`);
  if (/'/.test(body)) errors.push(`${name}: unterminated string literal`);
  if (!/;\s*$/.test(body.trim())) errors.push(`${name}: last statement does not end with ;`);
  return errors;
}

export function checkNames(files, baseFiles = []) {
  const errors = [];
  const seen = new Set();
  for (const f of files) {
    const m = NAME.exec(f);
    if (!m) { errors.push(`${f}: name must be <14-digit timestamp>_<snake_case>.sql`); continue; }
    if (seen.has(m[1])) errors.push(`${f}: duplicate migration number ${m[1]}`);
    seen.add(m[1]);
  }
  const base = new Set(baseFiles);
  const latest = [...base].sort().at(-1);
  for (const f of files.filter((x) => !base.has(x))) {
    if (latest && f < latest) errors.push(`${f}: new migration sorts before the latest on the base branch (${latest})`);
  }
  return errors;
}

export function checkAll({ files, baseFiles, read }) {
  const errors = checkNames(files, baseFiles);
  const added = files.filter((f) => !baseFiles.includes(f));
  for (const f of added) errors.push(...lintSql(f, read(f)));
  return errors;
}

function main() {
  const baseRef = process.argv[2];
  const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  const baseFiles = baseRef
    ? execFileSync('git', ['ls-tree', '--name-only', baseRef, `${DIR}/`], { encoding: 'utf8' })
        .split('\n').filter(Boolean).map((p) => p.split('/').pop())
    : files;
  const errors = checkAll({ files, baseFiles, read: (f) => readFileSync(`${DIR}/${f}`, 'utf8') });
  for (const e of errors) console.error(`::error::${e}`);
  console.log(`${files.length} migrations, ${files.filter((f) => !baseFiles.includes(f)).length} new, ${errors.length} problems`);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
