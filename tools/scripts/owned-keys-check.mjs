// Code-owned settings keys must not be written by a migration (docs/26 §5, 26-P0): the send gate and the
// Google sync switches are changed only through their module routes, so a migration can never turn
// sending on (staging holds real families). Old seeding migrations (142, 162, 610) sit at or below CUTOFF.
// Usage: node tools/scripts/owned-keys-check.mjs [migrationsDir]   exit 1 = a newer migration writes one.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DIR = 'packages/db/supabase/migrations';
export const CUTOFF = '20261023000621';
export const OWNED_KEYS = [
  'messaging_enabled',
  'auto_messages_enabled',
  'crm_cutover_done',
  'comms_source',
  'google_sync_enabled',
  'google_sync_mode',
];
// insert (incl. on conflict upserts), update, delete or merge on public.settings / settings.
const WRITE = /\b(insert\s+into|update(\s+only)?|delete\s+from|merge\s+into)\s+(public\s*\.\s*)?"?settings"?(?![\w$])/i;

/** true when the file's 14-digit number is above the cutoff; a name without one is checked too (fail safe). */
export function newerThan(name, cutoff = CUTOFF) {
  const m = /^(\d{14})_/.exec(name);
  return m ? m[1] > cutoff : true;
}

const quoteEnd = (sql, i, q) => {
  let j = i + 1;
  while (j < sql.length) {
    if (sql[j] === q && sql[j + 1] === q) j += 2;
    else if (sql[j] === q) return j + 1;
    else j += 1;
  }
  return sql.length;
};

/**
 * Splits SQL into statements on top-level `;`. Comments go; quoted strings stay (the keys are string
 * literals); each dollar-quoted body is set aside as `BODY` and split on its own, so a plpgsql
 * `update public.settings … 'messaging_enabled'` is one statement of its body.
 */
export function statements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const flush = () => {
    if (cur.trim()) out.push(cur.trim());
    cur = '';
  };
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const e = sql.indexOf('\n', i);
      i = e < 0 ? sql.length : e;
    } else if (sql.startsWith('/*', i)) {
      const e = sql.indexOf('*/', i + 2);
      i = e < 0 ? sql.length : e + 2;
      cur += ' ';
    } else if (sql[i] === "'" || sql[i] === '"') {
      const e = quoteEnd(sql, i, sql[i]);
      cur += sql.slice(i, e);
      i = e;
    } else {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
      if (tag) {
        const e = sql.indexOf(tag[0], i + tag[0].length);
        const end = e < 0 ? sql.length : e;
        out.push(...statements(sql.slice(i + tag[0].length, end)));
        cur += ' BODY ';
        i = e < 0 ? sql.length : end + tag[0].length;
      } else if (sql[i] === ';') {
        flush();
        i += 1;
      } else {
        cur += sql[i];
        i += 1;
      }
    }
  }
  flush();
  return out;
}

/** The owned keys a statement writes: a write to settings that names the key as a quoted literal. */
export function writtenKeys(stmt) {
  if (!WRITE.test(stmt)) return [];
  return OWNED_KEYS.filter((k) => new RegExp(`'+${k}'+`).test(stmt));
}

/** Every owned key the migration writes, as `<file>: …` messages (empty = fine). */
export function checkMigration(name, sql) {
  const keys = new Set(statements(sql).flatMap(writtenKeys));
  return [...keys].map(
    (k) =>
      `${name}: writes settings key '${k}' — owned by code (docs/26 §5); change it through its module route, never a migration`,
  );
}

/** The files above the cutoff and what each one writes. */
export function checkDir(dir = DIR, cutoff = CUTOFF) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && newerThan(f, cutoff)).sort();
  return { files, errors: files.flatMap((f) => checkMigration(f, readFileSync(`${dir}/${f}`, 'utf8'))) };
}

function main() {
  const { files, errors } = checkDir(process.argv[2] ?? DIR);
  for (const e of errors) console.error(`::error::${e}`);
  console.log(`${files.length} migrations after ${CUTOFF} checked for owned settings keys, ${errors.length} problems`);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
