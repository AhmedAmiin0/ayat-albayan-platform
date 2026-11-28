import assert from 'node:assert/strict';
import { test } from 'node:test';
import { throughPooler } from '../pooler.mjs';

const POOLER = 'aws-1-eu-central-1.pooler.supabase.com';
const DIRECT = 'db.abcref123.supabase.co';

test('pooler: a direct host goes to the session pooler with the project in the user', () => {
  const sent = new URL(throughPooler(`postgresql://reader:p%40ss@${DIRECT}:5432/postgres`));
  assert.equal(sent.hostname, POOLER);
  assert.equal(sent.port, '5432');
  assert.equal(sent.username, 'reader.abcref123');
  assert.equal(sent.password, 'p%40ss');
  assert.equal(sent.pathname, '/postgres');
});

test('pooler: a direct host on another port still lands on the session port', () => {
  const sent = new URL(throughPooler(`postgres://reader:pw@${DIRECT}:6543/postgres`));
  assert.equal(sent.port, '5432');
});

test('pooler: a pooler or any other host is left as it is', () => {
  const pooled = `postgresql://reader.abcref123:pw@${POOLER}:5432/postgres`;
  for (const url of [pooled, 'postgres://reader:pw@db.example/postgres']) {
    assert.equal(throughPooler(url), url);
  }
});

test('pooler: a host that only looks like a direct one is left as it is', () => {
  const lookalike = `postgres://reader:pw@${DIRECT}.evil.example/postgres`;
  assert.equal(throughPooler(lookalike), lookalike);
});

test('pooler: text that is not a url comes back unchanged for main to refuse', () => {
  for (const bad of ['', 'not a url', DIRECT]) {
    assert.equal(throughPooler(bad), bad);
  }
});
