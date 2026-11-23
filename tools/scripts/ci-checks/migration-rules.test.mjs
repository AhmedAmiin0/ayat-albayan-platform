import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lintSql } from './migration-check.mjs';

const LOCK = "set local lock_timeout = '5s';\n";
const rls = (sql) => lintSql('m.sql', sql).filter((e) => /row level security/.test(e));
const definer = (sql) => lintSql('m.sql', sql).filter((e) => /security definer/.test(e));
const lock = (sql) => lintSql('m.sql', sql).filter((e) => /lock_timeout/.test(e));
const destructive = (sql) => lintSql('m.sql', sql).filter((e) => /destructive/.test(e));

test('create table passes with row level security enabled on that table', () => {
  const sql = 'create table if not exists public.t (id int);\n'
    + 'alter table public.t enable row level security;\n';
  assert.deepEqual(rls(sql), []);
});

test('create table fails without row level security for that table', () => {
  const sql = 'create table public.t (id int);\ncreate table u (id int);\n'
    + 'alter table u enable row level security;\n';
  const e = rls(sql);
  assert.equal(e.length, 1);
  assert.match(e[0], /m\.sql: create table t needs enable row level security/);
});

test('security definer passes with search_path and execute revoked from public and anon', () => {
  const sql = "create function f() returns int language sql security definer set search_path = ''"
    + ' as $$ select 1 $$;\nrevoke execute on function f() from public, anon;\n';
  assert.deepEqual(definer(sql), []);
});

test('security definer passes when the revoke is built inside a do block', () => {
  const sql = "create function f() returns int language sql security definer set search_path = ''"
    + " as $$ select 1 $$;\ndo $$ begin execute format('revoke execute on function"
    + " public.%s from public, anon, authenticated', 'f()'); end $$;\n";
  assert.deepEqual(definer(sql), []);
});

test('security definer fails without search_path or without the revoke', () => {
  const noPath = 'create function f() returns int language sql security definer'
    + ' as $$ select 1 $$;\nrevoke execute on function f() from public, anon;\n';
  const noRevoke = 'create function f() returns int language sql security definer'
    + " set search_path = '' as $$ select 1 $$;\n"
    + '-- revoke execute on function f() from public, anon;\n';
  assert.match(definer(noPath)[0], /needs set search_path/);
  assert.match(definer(noRevoke)[0], /needs revoke execute .* from public, anon/);
});

test('ddl on an existing table passes with set local lock_timeout', () => {
  const sql = `${LOCK}alter table public.lessons add column x int;\n`
    + 'create unique index if not exists lessons_x on public.lessons (x);\n';
  assert.deepEqual(lock(sql), []);
});

test('ddl on a table created in the same file needs no lock_timeout', () => {
  const sql = 'create table public.t (id int);\nalter table public.t enable row level security;\n'
    + 'create index t_id on public.t (id);\n';
  assert.deepEqual(lock(sql), []);
});

test('ddl on an existing table fails without set local lock_timeout', () => {
  assert.match(lock('alter table lessons add constraint c check (true);\n')[0], /lock_timeout/);
  assert.match(lock('create index on public.lessons (x);\n')[0], /lock_timeout/);
  assert.match(lock('drop index if exists lessons_x;\n')[0], /lock_timeout/);
});

test('drop or rename passes with a destructive marker', () => {
  const sql = `-- destructive: column replaced by y in 20261001000001\n${LOCK}`
    + 'alter table lessons drop column x;\nalter table lessons rename column y to z;\n';
  assert.deepEqual(destructive(sql), []);
});

test('drop or rename fails without a destructive marker', () => {
  assert.match(destructive(`${LOCK}drop table if exists old_t;\n`)[0], /m\.sql: drop or rename/);
  assert.match(destructive(`${LOCK}alter table t rename to u;\n`)[0], /destructive: <reason>/);
  assert.match(destructive(`${LOCK}alter table t drop column x;\n`)[0], /destructive/);
});

test('dropping a policy, function or default is not destructive', () => {
  const sql = `${LOCK}drop policy if exists p on t;\ndrop function if exists f();\n`
    + 'alter table t alter column x drop default;\n';
  assert.deepEqual(destructive(sql), []);
});
