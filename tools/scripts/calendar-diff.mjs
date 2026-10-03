#!/usr/bin/env node
// Google Calendar → calendar-diff.sql (report of where the platform's schedule differs).
//
//   1. Google Calendar → Settings → Import & export → Export (a zip of one .ics per calendar); unzip it.
//   2. node tools/scripts/calendar-diff.mjs <folder or .ics files> [--today YYYY-MM-DD] > calendar-diff.sql
//   3. run calendar-diff.sql against the database (psql); it only reads, then ROLLBACK.
//
// The output holds students' names: keep it out of git and delete it when done.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseIcs } from './calendar-ics.mjs';
import { buildSql } from './calendar-sql.mjs';
import { toSlots } from './calendar-slots.mjs';

/** Every .ics under the given paths (folders are walked). */
export function icsFiles(paths) {
  return paths.flatMap((p) =>
    statSync(p).isDirectory()
      ? icsFiles(readdirSync(p).map((f) => join(p, f)))
      : p.toLowerCase().endsWith('.ics') ? [p] : [],
  );
}

export function parseArgs(argv) {
  const at = argv.indexOf('--today');
  const today = at >= 0 ? argv[at + 1] : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today ?? '')) throw new Error('--today must be YYYY-MM-DD');
  const paths = at >= 0 ? argv.filter((_, i) => i !== at && i !== at + 1) : argv;
  return { today, paths };
}

function main() {
  const { today, paths } = parseArgs(process.argv.slice(2));
  const files = icsFiles(paths);
  if (files.length === 0) {
    console.error('usage: calendar-diff.mjs <unzipped export folder | .ics files> [--today YYYY-MM-DD] > calendar-diff.sql');
    process.exit(1);
  }
  const calendars = files.map((f) => parseIcs(readFileSync(f, 'utf8')));
  const { slots, skipped } = toSlots(calendars, today);
  process.stdout.write(buildSql(slots, { calendars: calendars.length, today, skipped }));
  console.error(`${calendars.length} calendars → ${slots.length} slots (left out: ${JSON.stringify(skipped)})`);
}

if (process.argv[1]?.endsWith('calendar-diff.mjs')) main();
