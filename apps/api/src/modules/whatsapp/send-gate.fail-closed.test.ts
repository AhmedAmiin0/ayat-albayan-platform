import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeResult } from '../guardians/fake-db';
import { STUB_WA_ENV, fakeGate, rows } from './send-gate.fakes';

// docs/26 §5 «26-P4»: off for a missing row, JSON null, a string, a number, malformed, a failed read; on only for true.

const OFF_VALUES: [string, unknown][] = [
  ['JSON null', null], ['a string', 'true'], ['a number', 1], ['an object', {}], ['an array', [true]], ['false', false],
];
const OFF_READS: [string, FakeResult][] = [
  ['a missing row', rows({})],
  ['no data at all', { data: null }],
  ['malformed rows', { data: [{ key: 'messaging_enabled' }, { value: true }, null] }],
  ['another key holding true', rows({ crm_cutover_done: true, comms_source: true })],
  ...OFF_VALUES.map(([name, value]): [string, FakeResult] => [name, rows({ messaging_enabled: value, auto_messages_enabled: value })]),
];

describe('SendGate — fail-closed on every uncached read', () => {
  afterEach(() => vi.unstubAllEnvs());
  const configure = () => Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));

  it.each(OFF_READS)('%s → the gate and automatic messages are OFF', async (_name, read) => {
    configure();
    const { gate } = fakeGate([read, read, read]);
    const opened = await gate.open().catch(() => false);
    const auto = await gate.automaticOn().catch(() => false);
    const state = await gate.state().catch(() => ({ open: false }));
    expect([opened, auto, state.open]).toEqual([false, false, false]);
  });

  it('a failed read rejects open, automaticOn, state and view (never an open gate)', async () => {
    configure();
    const down: FakeResult = { error: { message: 'db down' } };
    const { gate } = fakeGate([down, down, down, down]);
    await expect(gate.open()).rejects.toThrow('db down');
    await expect(gate.automaticOn()).rejects.toThrow('db down');
    await expect(gate.state()).rejects.toThrow('db down');
    await expect(gate.view()).rejects.toThrow('db down');
  });

  it('ON only for a stored JSON true, per switch', async () => {
    configure();
    const { gate } = fakeGate([rows({ messaging_enabled: true }), rows({ messaging_enabled: true })]);
    await expect(gate.open()).resolves.toBe(true);
    await expect(gate.automaticOn()).resolves.toBe(false);
  });

  it('never cached: each call is one primary-key read, and a switch turned off is seen at once', async () => {
    configure();
    const { gate, calls } = fakeGate([rows({ messaging_enabled: true }), rows({ messaging_enabled: false })]);
    await expect(gate.open()).resolves.toBe(true);
    await expect(gate.open()).resolves.toBe(false);
    const reads = calls.filter((c) => c.table === 'settings');
    expect(reads.filter((c) => c.method === 'select')).toHaveLength(2);
    expect(reads.filter((c) => c.method === 'in').map((c) => c.args)).toEqual(
      Array(2).fill(['key', ['messaging_enabled', 'auto_messages_enabled']]),
    );
  });
});
