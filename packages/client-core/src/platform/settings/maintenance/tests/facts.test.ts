import { describe, expect, it, vi } from 'vitest';
import type { ProbeAnswer } from '../../../../core/http/index.js';
import { maintenanceFacts } from '../maintenance.js';

const ok = (body: unknown): ProbeAnswer => ({ status: 200, body });
const status = (code: number): ProbeAnswer => ({ status: code, body: null });
const ON = ok({ maintenance_mode: true, upload_max_mb: 10 });
const OFF = ok({ maintenance_mode: false });

function probes(answers: (ProbeAnswer | null)[], online = true) {
  const queue = [...answers];
  return {
    api: vi.fn(() => Promise.resolve(queue.shift() ?? null)),
    deviceOnline: vi.fn(() => online),
    pause: vi.fn(() => Promise.resolve()),
  };
}

describe('maintenanceFacts: one answer settles it', () => {
  it.each([
    ['switch on', ON, { flag: true, down: false }],
    ['switch off', OFF, { flag: false, down: false }],
    ['an old API without the key', ok({ upload_max_mb: 10 }), { flag: false, down: false }],
    ['a body that is not JSON', ok('<html>'), { flag: false, down: false }],
    ['a 204', { status: 204, body: undefined }, { flag: false, down: false }],
  ])('%s', async (_name, answer, facts) => {
    const p = probes([answer]);
    await expect(maintenanceFacts(p)).resolves.toEqual(facts);
    expect(p.api).toHaveBeenCalledTimes(1);
    expect(p.pause).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 429, 500])('a %i keeps the last verdict (throws), asked once', async (code) => {
    const p = probes([status(code)]);
    await expect(maintenanceFacts(p)).rejects.toThrow(/keeping the last verdict/);
    expect(p.api).toHaveBeenCalledTimes(1);
  });
});

describe('maintenanceFacts: a silent API is asked again after a pause', () => {
  const DOWN = { flag: false, down: true };
  it.each([
    { name: 'no answer, then none', answers: [null, null], facts: DOWN },
    { name: '502, then 503', answers: [status(502), status(503)], facts: DOWN },
    { name: '504, then no answer', answers: [status(504), null], facts: DOWN },
    { name: 'no answer, then the switch on', answers: [null, ON], facts: { flag: true, down: false } },
    { name: '503, then healthy', answers: [status(503), OFF], facts: { flag: false, down: false } },
  ])('$name', async ({ answers, facts }) => {
    const p = probes(answers);
    await expect(maintenanceFacts(p)).resolves.toEqual(facts);
    expect(p.api).toHaveBeenCalledTimes(2);
    expect(p.pause).toHaveBeenCalledTimes(1);
  });

  it('a 4xx on the second ask keeps the last verdict', async () => {
    const p = probes([null, status(401)]);
    await expect(maintenanceFacts(p)).rejects.toThrow();
    expect(p.api).toHaveBeenCalledTimes(2);
  });
});

describe('maintenanceFacts: an offline device never draws a screen', () => {
  it('no answer while the device is offline throws, without a second ask', async () => {
    const p = probes([null, null], false);
    await expect(maintenanceFacts(p)).rejects.toThrow(/offline/);
    expect(p.api).toHaveBeenCalledTimes(1);
    expect(p.pause).not.toHaveBeenCalled();
  });

  it('a 503 is an answer: the device is online, so it is not asked', async () => {
    const p = probes([status(503), status(503)], false);
    await expect(maintenanceFacts(p)).resolves.toEqual({ flag: false, down: true });
    expect(p.deviceOnline).not.toHaveBeenCalled();
  });

  it('an async online check is awaited', async () => {
    const p = { ...probes([null, null]), deviceOnline: vi.fn(() => Promise.resolve(false)) };
    await expect(maintenanceFacts(p)).rejects.toThrow(/offline/);
  });
});
