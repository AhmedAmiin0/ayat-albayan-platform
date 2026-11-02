#!/usr/bin/env node
// Backfill of the old «[edit]» / «[revoke]» / «[image]» … rows (owner 2026-10-30, migration
// 20261030000992 first). Never connects to a database: the operator exports, reviews and runs.
//
//   1. node tools/scripts/chat-markers/chat-markers-backfill.mjs --export > export.sql
//      psql "$DB" -At -f export.sql > markers.json        (read only)
//   2. node tools/scripts/chat-markers/chat-markers-backfill.mjs markers.json --dry-run
//      → the counts per placeholder and outcome; nothing is written anywhere.
//   3. node tools/scripts/chat-markers/chat-markers-backfill.mjs markers.json > backfill.sql
//      review backfill.sql, then psql "$DB" -v ON_ERROR_STOP=1 -f backfill.sql (one transaction).
//      Re-runnable: a row already fixed no longer matches.
// markers.json holds phone numbers and message text: keep it out of git and delete it when done.
import { readFileSync } from 'node:fs';
import { planAll } from './markers-plan.mjs';
import { buildSql, EXPORT_SQL } from './markers-sql.mjs';

export function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const file = argv.find((a) => !a.startsWith('--')) ?? null;
  return { file, dryRun: flags.has('--dry-run'), export: flags.has('--export') };
}

/** The dry-run report: counts only (never a phone or a text). */
export function report({ counts, updates }) {
  const lines = [`rows read: ${counts.rows}, to fix: ${counts.candidates}`];
  for (const [k, n] of Object.entries(counts.byType)) lines.push(`  [${k}]: ${n}`);
  lines.push('outcome:');
  for (const [k, n] of Object.entries(counts.byKind)) lines.push(`  ${k}: ${n}`);
  lines.push(`originals to mark (edit / revoke with a stored context id): ${updates.filter((u) => u.apply).length}`);
  return `${lines.join('\n')}\n`;
}

/** The CLI's output for its arguments and the export's JSON text. */
export function run(args, read) {
  if (args.export) return `${EXPORT_SQL};\n`;
  if (!args.file) throw new Error('usage: chat-markers-backfill.mjs --export | <markers.json> [--dry-run]');
  const plan = planAll(JSON.parse(read(args.file)));
  return args.dryRun ? report(plan) : buildSql(plan.updates, { commit: true });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(run(parseArgs(process.argv.slice(2)), (f) => readFileSync(f, 'utf8')));
}
