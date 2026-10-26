// clear:demo must refuse rather than quietly detach or cascade-delete app rows. Read every FK into a
// table it deletes from the migrations, so a new SET NULL / CASCADE reference fails here first.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DELETE_ORDER, SET_NULL_DEPENDENTS } from './clear-demo.plan.mjs';

const dir = new URL('../../../packages/db/supabase/migrations/', import.meta.url);
const TABLE = /^\s*(?:create|alter) table (?:if not exists |if exists |only )*public\.(\w+)/i;
const FK =
  /^\s*(?:add column (?:if not exists )?)?(\w+) uuid[^,]* references public\.(\w+) \(id\) on delete (set null|cascade)/i;

function fksOnDelete() {
  const found = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    let table = '';
    for (const line of readFileSync(new URL(file, dir), 'utf8').split('\n')) {
      table = TABLE.exec(line)?.[1] ?? table;
      const m = FK.exec(line);
      if (m && DELETE_ORDER.includes(m[2])) {
        found.push({ table, column: m[1], parent: m[2], action: m[3].toLowerCase() });
      }
    }
  }
  return found;
}

const key = (d) => `${d.table}.${d.column} -> ${d.parent}`;

test('the migrations are parsed (sanity: known FKs are found)', () => {
  const keys = fksOnDelete().map(key);
  assert.ok(keys.includes('messages.lead_id -> leads'), keys.join('\n'));
  assert.ok(keys.includes('teacher_availability.teacher_id -> teachers'), keys.join('\n'));
});

test('every ON DELETE SET NULL reference to a demo table is checked before the delete', () => {
  const setNull = fksOnDelete()
    .filter((d) => d.action === 'set null')
    .map(key)
    .sort();
  assert.deepEqual(SET_NULL_DEPENDENTS.map(key).sort(), setNull);
});

test('ON DELETE CASCADE only removes rows the seed itself owns', () => {
  for (const d of fksOnDelete().filter((x) => x.action === 'cascade')) {
    assert.ok(DELETE_ORDER.includes(d.table), `${key(d)} would cascade-delete app rows`);
  }
});
