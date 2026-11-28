import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codeOf, exitQuietly, main } from '../main.mjs';
import { fixturePath } from './fixtures.mjs';

const URL_VALUE = 'postgres://reader:pw@db.example/postgres';

const fakeDb = (answer) => {
  const seen = { modes: [], sent: [], setup: [], order: [], ended: false, url: null, driver: null };
  const connect = (url, driverOptions) => {
    Object.assign(seen, { url, driver: driverOptions });
    return {
      begin: (mode, run) => {
        seen.modes.push(mode);
        const log = [];
        seen.order.push(log);
        const setLocal = (sql, args, options) => {
          log.push('limit');
          seen.setup.push([sql, args, options]);
          return [];
        };
        const count = (sql, args, options) => {
          log.push('count');
          seen.sent.push([args, options]);
          return answer(sql);
        };
        const unsafe = async (sql, args, options) =>
          sql.startsWith('set local') ? setLocal(sql, args, options) : count(sql, args, options);
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
  const warned = [];
  const db = fakeDb(answer);
  const write = (line) => out.push(line);
  const warn = (line) => warned.push(line);
  const code = await main({ file: fixturePath(file), url, connect: db.connect, write, warn });
  return { code, out, warned, seen: db.seen };
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

test('main: each count sets its time limit first, inside its own transaction', async () => {
  const { seen } = await run('valid', async () => [{ count: '1' }]);
  const limit = ["set local statement_timeout = '30s'", [], { simple: false }];
  assert.deepEqual(seen.setup, [limit, limit, limit]);
  const each = ['limit', 'count'];
  assert.deepEqual(seen.order, [each, each, each]);
});

test('main: the driver gets one connection, no type lookup and no notices', async () => {
  const { seen } = await run('valid', async () => [{ count: '1' }]);
  const { onnotice, ...plain } = seen.driver;
  assert.deepEqual(plain, { max: 1, connect_timeout: 15, fetch_types: false });
  assert.equal(onnotice({ message: 'row "Ahmed"' }), undefined);
});

test('exitQuietly: an error thrown outside main ends the run with code 1, unprinted', () => {
  const handlers = {};
  const codes = [];
  const on = (event, handle) => Object.assign(handlers, { [event]: handle });
  exitQuietly({ on, exit: (code) => codes.push(code) });
  handlers.uncaughtException(new Error(URL_VALUE));
  assert.deepEqual([Object.keys(handlers), codes], [['uncaughtException'], [1]]);
});

test('main: a failing count prints only its code, never the message', async () => {
  const answer = async (sql) => {
    if (sql.includes('status')) {
      throw Object.assign(new Error('invalid input syntax: "Ahmed"'), { code: '22P02' });
    }
    return [{ count: '1' }];
  };
  const { code, out, warned, seen } = await run('valid', answer);
  assert.deepEqual([code, out, seen.ended], [1, [], true]);
  assert.deepEqual(warned, ['a count failed: 22P02']);
});

test('main: the same code from several counts is printed once', async () => {
  const denied = Object.assign(new Error('permission denied for table payments'), {
    code: '42501',
  });
  const { warned } = await run('valid', async () => {
    throw denied;
  });
  assert.deepEqual(warned, ['a count failed: 42501']);
});

test('codeOf: only a SQLSTATE or an upper-case code passes, the rest is unknown', () => {
  const ok = ['28P01', 'XX000', 'ECONNREFUSED', 'CONNECT_TIMEOUT', 'ERR_INVALID_URL'];
  for (const code of ok) assert.equal(codeOf({ code }), code);
  const bad = [undefined, null, 'Ahmed', 'reader:pw@db', '28p01', 'A', 12, 'X'.repeat(41)];
  for (const code of bad) assert.equal(codeOf({ code }), 'unknown', String(code));
  assert.equal(codeOf(undefined), 'unknown');
  assert.equal(codeOf('ECONNREFUSED'), 'unknown');
});

test('main: a result that is not an integer prints nothing', async () => {
  const { code, out } = await run('valid', async () => [{ count: 'Ahmed' }]);
  assert.deepEqual([code, out], [1, []]);
});

test('main: a connect that throws prints only its code, never its message or input', async () => {
  const out = [];
  const warned = [];
  const connect = () => {
    const invalid = new TypeError('Invalid URL');
    throw Object.assign(invalid, { input: URL_VALUE, code: 'ERR_INVALID_URL' });
  };
  const write = (line) => out.push(line);
  const warn = (line) => warned.push(line);
  const code = await main({ file: fixturePath('valid'), url: URL_VALUE, connect, write, warn });
  assert.deepEqual([code, out, warned], [1, [], ['a count failed: ERR_INVALID_URL']]);
});

test('main: a rejected file never connects', async () => {
  const { code, out, seen } = await run('rejected', async () => [{ count: '1' }]);
  assert.deepEqual([code, out, seen.url], [1, [], null]);
});

test('main: a missing database url never connects', async () => {
  const { code, out, seen } = await run('valid', async () => [{ count: '1' }], '');
  assert.deepEqual([code, out, seen.url], [1, [], null]);
});
