import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CUTOFF, DIR, checkDir, checkMigration, newerThan, statements } from './owned-keys-check.mjs';

const NEW = '20261023000700_x.sql';
const fails = (sql, key) => {
  const e = checkMigration(NEW, sql);
  assert.equal(e.length, 1, sql);
  assert.match(e[0], new RegExp(`^${NEW}: writes settings key '${key}'`));
};
const passes = (sql) => assert.deepEqual(checkMigration(NEW, sql), [], sql);

test('newerThan: strictly above the cutoff; the old seeds (142, 162, 610) and 621 itself are not checked', () => {
  assert.equal(CUTOFF, '20261023000621');
  for (const f of ['20261001000142_messaging.sql', '20261022000610_google_sync.sql', `${CUTOFF}_wa_number_secrets.sql`]) {
    assert.equal(newerThan(f), false, f);
  }
  assert.equal(newerThan('20261023000630_config_expand.sql'), true);
  assert.equal(newerThan('oops.sql'), true, 'a name without a number is checked (fail safe)');
});

test('FAILS: an insert of messaging_enabled', () => {
  fails("insert into public.settings (key, value) values ('messaging_enabled', 'true'::jsonb);", 'messaging_enabled');
});

test('FAILS: an update inside a plpgsql body', () => {
  fails(
    `create or replace function public.flip() returns void language plpgsql as $fn$
     begin
       perform 1;
       update public.settings set value = 'true' where key = 'auto_messages_enabled';
     end $fn$;`,
    'auto_messages_enabled',
  );
  fails("do $$ begin update settings set value = 'false' where key = 'crm_cutover_done'; end $$;", 'crm_cutover_done');
});

test('FAILS: an upsert of google_sync_mode, unqualified and over several lines', () => {
  fails(
    `INSERT INTO settings (key, value)
       VALUES ('google_sync_mode', '"two_way"')
       ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
    'google_sync_mode',
  );
});

test('FAILS: dynamic SQL in a string and a delete of comms_source', () => {
  fails("do $$ begin execute 'update public.settings set value = ''1'' where key = ''google_sync_enabled'''; end $$;", 'google_sync_enabled');
  fails("delete from public.settings where key = 'comms_source';", 'comms_source');
});

test('FAILS: fully quoted names, the config_set / config_seed RPCs and COPY', () => {
  fails(`INSERT INTO "public"."settings" ("key","value") VALUES ('messaging_enabled','true');`, 'messaging_enabled');
  fails(`select public.config_set('[{"key":"auto_messages_enabled","value":true,"expected_version":0}]'::jsonb, null);`, 'auto_messages_enabled');
  fails("select public.config_set(jsonb_build_array(jsonb_build_object('key','crm_cutover_done','value',true)), null);", 'crm_cutover_done');
  fails("COPY public.settings (key, value) FROM stdin;", '<copy into settings>');
});

test('PASSES: the same insert in an older-numbered file is not checked', () => {
  const dir = mkdtempSync(join(tmpdir(), 'owned-keys-'));
  const sql = "insert into public.settings (key, value) values ('messaging_enabled', 'true');";
  writeFileSync(join(dir, '20261001000142_messaging.sql'), sql);
  assert.deepEqual(checkDir(dir).errors, []);
  writeFileSync(join(dir, NEW), sql);
  assert.equal(checkDir(dir).errors.length, 1);
});

test('PASSES: reading a key, an unrelated key, other tables, comments and a function that only reads', () => {
  passes("select value from public.settings where key = 'messaging_enabled';");
  passes("insert into public.settings (key, value) values ('booking_horizon_weeks', '8') on conflict do nothing;");
  passes("insert into public.settings_audit (key) values ('messaging_enabled');");
  passes("-- update public.settings set value = 'true' where key = 'messaging_enabled';\nselect 1;");
  passes("/* insert into settings values ('comms_source') */ select 1;");
  passes(
    `create function public.r() returns boolean language sql as $$
       select value = 'true' from public.settings where key = 'messaging_enabled'
     $$;
     update public.settings set version = version where key = 'booking_horizon_weeks';`,
  );
});

test('statements: splits on top-level ; only and pulls dollar bodies out', () => {
  const s = statements("select ';'; do $x$ begin perform 1; perform 2; end $x$; select $1;");
  assert.deepEqual(s, ["select ';'", 'begin perform 1', 'perform 2', 'end', 'do  BODY', 'select $1']);
});

test('the real migrations directory passes (incl. 20261023000630 when present)', () => {
  const dir = fileURLToPath(new URL(`../../../${DIR}`, import.meta.url));
  const { files, errors } = checkDir(dir);
  assert.deepEqual(errors, []);
  assert.ok(files.every((f) => f > `${CUTOFF}_`));
});
