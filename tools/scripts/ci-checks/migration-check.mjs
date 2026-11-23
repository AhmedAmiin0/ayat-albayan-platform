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

// Safety rules for added files, which go straight to production (docs/57 OPS-6, SPT-14).
const TABLE = String.raw`((?:"?\w+"?\.)?"?\w+"?)`;
const ALTER = String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?`;
const named = (prefix, suffix = '') => new RegExp(`${prefix}${TABLE}${suffix}`, 'gi');
const CREATE_TABLE = named(String.raw`\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?`);
const ALTER_TABLE = named(ALTER);
const RLS_ON = named(ALTER, String.raw`\s+enable\s+row\s+level\s+security`);
const CREATE_INDEX = named(String.raw`\bcreate\s+(?:unique\s+)?index\b[^;]*?\bon\s+(?:only\s+)?`);
const DROP_LOCKING = /\bdrop\s+(?:table|index)\b/i;
const DESTRUCTIVE = /\bdrop\s+(?:table|schema|column)\b|\brename\s+(?:to|column)\b/i;
const LOCK_TIMEOUT = /\bset\s+local\s+lock_timeout\b/i;
const SEARCH_PATH = /\bset\s+search_path\b/i;
const REVOKE_PUBLIC = /\brevoke\s+(?:all|execute)\b[^;]*?\bfrom\s+public\s*,[^;]*?\banon\b/i;
const MARKER = /--\s*destructive:\s*\S/i;

const bare = (name) => name.replaceAll('"', '').replace(/^public\./i, '').toLowerCase();
const targets = (re, sql) => [...sql.matchAll(re)].map((m) => bare(m[1]));
const withoutComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

function tablesWithoutRls(body) {
  const rlsOn = new Set(targets(RLS_ON, body));
  return targets(CREATE_TABLE, body).filter((t) => !rlsOn.has(t));
}

function touchesExistingTable(body) {
  const created = new Set(targets(CREATE_TABLE, body));
  const touched = [...targets(ALTER_TABLE, body), ...targets(CREATE_INDEX, body)];
  return DROP_LOCKING.test(body) || touched.some((t) => !created.has(t));
}

function definerProblems({ body, code }) {
  const missing = [
    [!SEARCH_PATH.test(body), 'security definer needs set search_path'],
    [!REVOKE_PUBLIC.test(code), 'security definer needs revoke execute … from public, anon'],
  ];
  return missing.filter(([bad]) => bad).map(([, message]) => message);
}

const RULES = [
  ({ body }) => tablesWithoutRls(body)
    .map((t) => `create table ${t} needs enable row level security`),
  (sql) => (/\bsecurity\s+definer\b/i.test(sql.body) ? definerProblems(sql) : []),
  ({ body }) => (touchesExistingTable(body) && !LOCK_TIMEOUT.test(body)
    ? ['ddl on an existing table needs set local lock_timeout'] : []),
  ({ body, raw }) => (DESTRUCTIVE.test(body) && !MARKER.test(raw)
    ? ['drop or rename needs a -- destructive: <reason> marker'] : []),
];

function ruleErrors({ name, raw, body }) {
  const sql = { raw, body, code: withoutComments(raw) };
  return RULES.flatMap((rule) => rule(sql)).map((e) => `${name}: ${e}`);
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
  return [...errors, ...ruleErrors({ name, raw: sql, body })];
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
