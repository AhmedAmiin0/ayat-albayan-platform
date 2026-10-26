import { describe, expect, it } from 'vitest';
import { PHONES } from '../sign-in.fakes.accounts';
import { signInWorld } from '../sign-in.world';

const IP = '203.0.113.2';

describe('the codes gate (docs/30 §4): flag, pepper, approved template', () => {
  it.each([
    ['family_login_enabled off', signInWorld({ settings: { family_login_enabled: false } })],
    ['no pepper', signInWorld({ pepper: null })],
  ])('%s: unavailable, requests answer the same and send nothing, checks are 503', async (_name, w) => {
    await expect(w.family.available()).resolves.toBe(false);
    w.family.request({ phone: PHONES.guardian }, IP);
    w.passwords.forgot({ identifier: 'omar' }, IP);
    await w.kit.idle();
    expect(w.send.sent).toEqual([]);
    await expect(w.family.verify({ phone: PHONES.guardian, code: '123456' }, IP)).rejects.toThrow('codes_unavailable');
    await expect(w.passwords.reset({ identifier: 'omar', code: '123456', password: 'New-pass-123' }, IP, 8)).rejects.toThrow('codes_unavailable');
  });

  it('template not approved / send gate closed: unavailable too', async () => {
    const w = signInWorld();
    w.send.open = false;
    await expect(w.family.available()).resolves.toBe(false);
    w.family.request({ phone: PHONES.guardian }, IP);
    await w.kit.idle();
    expect(w.send.sent).toEqual([]);
  });
});

describe('rate limits', () => {
  it('3 codes per phone per 15 minutes, then silence (still the same answer)', async () => {
    const w = signInWorld();
    for (let i = 0; i < 4; i += 1) w.family.request({ phone: PHONES.guardian }, `198.51.100.${i}`);
    await w.kit.idle();
    expect(w.send.sent).toHaveLength(3);
  });

  it('429 after 5 requests for one identifier, however it is spelled', () => {
    const w = signInWorld();
    for (let i = 0; i < 5; i += 1) w.family.request({ phone: i % 2 ? '+966500000001' : '00966500000001' }, `198.51.100.${i}`);
    expect(() => w.family.request({ phone: '+966 50 000 0001' }, '198.51.100.99')).toThrow('too_many_requests');
  });

  it('10 wrong codes a day per phone stop the checks, across codes', async () => {
    const w = signInWorld();
    const wrongFor = (code: string) => (code === '000000' ? '111111' : '000000');
    for (let round = 0; round < 2; round += 1) {
      w.family.request({ phone: PHONES.guardian }, `192.0.2.${round}`);
      await w.kit.idle();
      const code = w.send.lastTo(PHONES.guardian);
      for (let i = 0; i < 5; i += 1) await w.family.verify({ phone: PHONES.guardian, code: wrongFor(code) }, `192.0.2.${10 + round * 5 + i}`).catch(() => undefined);
    }
    w.family.request({ phone: PHONES.guardian }, '192.0.2.99');
    await w.kit.idle();
    expect(w.send.sent).toHaveLength(2);
  });
});
