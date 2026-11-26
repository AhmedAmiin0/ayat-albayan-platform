import assert from 'node:assert/strict';
import { test } from 'node:test';
import { main } from '../main.mjs';
import { fixturePath } from './fixtures.mjs';

const URL_VALUE = 'postgres://reader:pw@db.example/postgres';

const fakeDb = (answer) => {
  const seen = { modes: [], sent: [], ended: false, url: null };
  const connect = (url) => {
    seen.url = url;
    return {
      begin: (mode, run) => {
        seen.modes.push(mode);
        const unsafe = (sql, args, options) => {
          seen.sent.push([args, options]);
          return answer(sql);
        };
        return run({ unsafe });
      },
      end: () => {
        seen.ended = true;
        return Promise.resolve();
      },
    };
  };
  return { seen, connect };
};

const run = async (file, answer, url = URL_VALUE) => {
  const out = [];
  const db = fakeDb(answer);
  const write = (line) => out.push(line);
  const code = await main({ file: fixturePath(file), url, connect: db.connect, write });
  return { code, out, seen: db.seen };
};

test('main: each count runs alone, read-only, and prints only «name: n»', async () => {
  const { code, out, seen } = await run('valid', async (sql) => [
    { count: String(sql.length % 7) },
  ]);
  assert.equal(code, 0);
  assert.deepEqual(
    out.map((l) => l.replace(/\d+$/, 'n')),
    ['payments_amount_null: n', 'payments_status_unknown: n', 'payments_total: n'],
  );
  assert.deepEqual(seen.modes, ['read only', 'read only', 'read only']);
  const oneStatement = [[], { simple: false }];
  assert.deepEqual(seen.sent, [oneStatement, oneStatement, oneStatement]);
  assert.equal(seen.ended, true);
});

test('main: a failing statement fails the run and prints nothing, not even the error', async () => {
  const answer = async (sql) => {
    if (sql.includes('status')) throw new Error('invalid input syntax: "Ahmed"');
    return [{ count: '1' }];
  };
  const { code, out, seen } = await run('valid', answer);
  assert.deepEqual([code, out, seen.ended], [1, [], true]);
});

test('main: a result that is not an integer prints nothing', async () => {
  const { code, out } = await run('valid', async () => [{ count: 'Ahmed' }]);
  assert.deepEqual([code, out], [1, []]);
});

test('main: a connect that throws prints nothing, not even its error', async () => {
  const out = [];
  const warned = [];
  const connect = () => {
    throw Object.assign(new TypeError('Invalid URL'), { input: URL_VALUE });
  };
  const write = (line) => out.push(line);
  const warn = (line) => warned.push(line);
  const code = await main({ file: fixturePath('valid'), url: URL_VALUE, connect, write, warn });
  assert.deepEqual([code, out, warned], [1, [], []]);
});

test('main: a rejected file never connects', async () => {
  const { code, out, seen } = await run('rejected', async () => [{ count: '1' }]);
  assert.deepEqual([code, out, seen.url], [1, [], null]);
});

test('main: a missing database url never connects', async () => {
  const { code, out, seen } = await run('valid', async () => [{ count: '1' }], '');
  assert.deepEqual([code, out, seen.url], [1, [], null]);
});
