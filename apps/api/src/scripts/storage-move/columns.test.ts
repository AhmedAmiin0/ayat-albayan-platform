import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { columnsFor, MOVED_COLUMNS, NOT_MOVED } from './columns';

// A migration that adds a column named *path / *paths must name it in columns.ts: either the
// move rewrites it (MOVED_COLUMNS) or it says why not (NOT_MOVED). Comments are stripped first.

const MIGRATIONS = join(__dirname, '..', '..', '..', '..', '..', 'packages/db/supabase/migrations');
const TABLE = /create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/gi;
const COLUMN = /^\s*(\w*paths?)\s+\w/gim;
const ALTER = /alter table (?:only )?(?:if exists )?public\.(\w+)([^;]*);/gi;
const ADDED = /add column (?:if not exists )?(\w*paths?)\b/gi;

const sqlOf = (file: string): string =>
  readFileSync(join(MIGRATIONS, file), 'utf8').replace(/--[^\n]*/g, '');

function pathColumns(sql: string): string[] {
  const created = [...sql.matchAll(TABLE)].flatMap(([, table, body]) =>
    [...(body ?? '').matchAll(COLUMN)].map(([, c]) => `${table ?? ''}.${c ?? ''}`),
  );
  const added = [...sql.matchAll(ALTER)].flatMap(([, table, rest]) =>
    [...(rest ?? '').matchAll(ADDED)].map(([, c]) => `${table ?? ''}.${c ?? ''}`),
  );
  return [...created, ...added];
}

const everyPathColumn = (): string[] => [
  ...new Set(
    readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .flatMap((f) => pathColumns(sqlOf(f))),
  ),
];

describe('storage-move column inventory (docs/45 §6)', () => {
  it('names every *_path column the migrations create, moved or not', () => {
    const listed = new Set([
      ...MOVED_COLUMNS.map((c) => `${c.table}.${c.column}`),
      ...NOT_MOVED.map((n) => n.at),
    ]);
    const found = everyPathColumn();
    expect(found.length).toBeGreaterThanOrEqual(MOVED_COLUMNS.length);
    expect(found.filter((c) => !listed.has(c))).toEqual([]);
  });

  it('every moved column still exists in a migration (no stale entry)', () => {
    const found = new Set(everyPathColumn());
    expect(MOVED_COLUMNS.filter((c) => !found.has(`${c.table}.${c.column}`))).toEqual([]);
  });

  it('the parser sees a column a new migration would add', () => {
    const sql = 'alter table public.things add column if not exists scan_path text; -- x_path';
    expect(pathColumns(sql)).toEqual(['things.scan_path']);
    expect(pathColumns('create table public.t (\n  id uuid,\n  file_paths text[]\n);')).toEqual([
      't.file_paths',
    ]);
  });

  it('recordings move only when named; a named table moves alone', () => {
    expect(columnsFor(undefined).map((c) => c.table)).not.toContain('lesson_recordings');
    expect(columnsFor('lesson_recordings')).toHaveLength(1);
    expect(columnsFor('payments')).toEqual([
      { table: 'payments', column: 'receipt_path', bucket: 'receipts' },
    ]);
  });
});
