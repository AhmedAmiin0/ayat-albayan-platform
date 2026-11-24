import { describe, expect, it, vi } from 'vitest';
import { BeatBook } from './beat-book';

function setup(start = 1_000) {
  let now = start;
  const book = new BeatBook(() => now);
  return { book, at: (ms: number) => (now = ms) };
}

describe('BeatBook (each job’s last success and last error, server clock)', () => {
  it('a registered job counts from its first due run and has no success yet', () => {
    const t = setup();
    t.book.register({ name: 'a', everyMs: 60_000, firstMs: 5_000 });
    expect(t.book.list()).toEqual([
      { name: 'a', everyMs: 60_000, since: 6_000, lastOkAt: null, lastErrorAt: null, lastError: null },
    ]);
  });

  it('ok() and fail() stamp the clock; the error text is cut to 500 characters', () => {
    const t = setup();
    t.book.register({ name: 'a', everyMs: 60_000, firstMs: 0 });
    t.at(2_000);
    t.book.ok('a');
    t.at(3_000);
    t.book.fail('a', new Error('x'.repeat(600)));
    const [beat] = t.book.list();
    expect(beat).toMatchObject({ lastOkAt: 2_000, lastErrorAt: 3_000 });
    expect(beat?.lastError).toHaveLength(500);
  });

  it('a thrown non-Error is kept as text', () => {
    const t = setup();
    t.book.register({ name: 'a', everyMs: 1, firstMs: 0 });
    t.book.fail('a', 'down');
    expect(t.book.list()[0]?.lastError).toBe('down');
  });

  it('a beat for an unknown job is ignored; forget() drops a job', () => {
    const t = setup();
    t.book.ok('ghost');
    t.book.fail('ghost', new Error('x'));
    t.book.register({ name: 'a', everyMs: 1, firstMs: 0 });
    t.book.forget('a');
    expect(t.book.list()).toEqual([]);
  });

  it('every change reaches the listeners; a throwing listener never stops a job', () => {
    const t = setup();
    const seen = vi.fn();
    t.book.onChange(() => {
      throw new Error('mirror down');
    });
    t.book.onChange(seen);
    t.book.register({ name: 'a', everyMs: 1, firstMs: 0 });
    expect(() => t.book.ok('a')).not.toThrow();
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('BeatBook passes (a job that catches its own errors is not «ok»)', () => {
  it('an error recorded during a pass keeps that pass from counting as a success', () => {
    const t = setup();
    t.book.register({ name: 'a', everyMs: 1, firstMs: 0 });
    t.book.begin('a');
    t.at(2_000);
    t.book.fail('a', new Error('db down'));
    t.book.ok('a');
    expect(t.book.list()[0]).toMatchObject({ lastOkAt: null, lastErrorAt: 2_000 });
    t.book.begin('a');
    t.at(3_000);
    t.book.ok('a');
    expect(t.book.list()[0]?.lastOkAt).toBe(3_000);
  });

  it('failLogged: an error line under a job’s logger context fails that job and its lanes only', () => {
    const t = setup();
    for (const name of ['MessageSender:chat', 'MessageSender:main', 'MessageSenderX', 'ExpensesJob']) {
      t.book.register({ name, everyMs: 1, firstMs: 0 });
    }
    t.book.failLogged('MessageSender', 'send pass aborted');
    t.book.failLogged('NotAJob', 'x');
    const failed = t.book.list().filter((b) => b.lastError !== null).map((b) => b.name);
    expect(failed).toEqual(['MessageSender:chat', 'MessageSender:main']);
  });
});
