import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STAGING_REF } from './clear-demo.plan.mjs';
import { allowedSupabase, parseArgs } from './create-login.plan.mjs';

test('only local Supabase or the staging project are allowed, judged on the parsed host', () => {
  assert.equal(allowedSupabase('http://127.0.0.1:54321'), true);
  assert.equal(allowedSupabase(`https://${STAGING_REF}.supabase.co`), true);
  assert.equal(allowedSupabase('https://prodprodprodprod.supabase.co'), false);
  assert.equal(allowedSupabase(`https://evil.example/${STAGING_REF}.supabase.co`), false);
  assert.equal(allowedSupabase('not a url'), false);
});

test('parses email, role and name; the email is lower-cased and the role defaults to teacher', () => {
  const a = parseArgs(['--email', ' Abrar@X.com ', '--name', 'أبرار'], () => 'generated1');
  assert.deepEqual([a.ok, a.email, a.role, a.name, a.password, a.generated], [true, 'abrar@x.com', 'teacher', 'أبرار', 'generated1', true]);
});

test('an explicit password is kept and not marked generated', () => {
  const a = parseArgs(['--email', 'a@b.co', '--name', 'n', '--password', 'longenough1']);
  assert.deepEqual([a.ok, a.password, a.generated], [true, 'longenough1', false]);
});

test('rejects a bad email, an unknown role, a missing name and a short password', () => {
  const a = parseArgs(['--email', 'nope', '--role', 'root', '--password', 'short']);
  assert.equal(a.ok, false);
  assert.equal(a.errors.length, 4);
});
