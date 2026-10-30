import { describe, expect, it, vi } from 'vitest';
import { signInWorld } from '../sign-in.world';
import type { CodeTarget } from './code-issuer';

const TARGET: CodeTarget = { purpose: 'sign_in', subject: { kind: 'guardian', id: 'g-1' }, phone: '+966500000001' };

describe('CodeIssuer: the shared per-phone send buckets (docs/09)', () => {
  it('a code that goes out takes the 15-minute and the day bucket once each', async () => {
    const w = signInWorld();
    const take = vi.spyOn(w.limitStore, 'take');
    expect(await w.kit.issue(TARGET)).toBe(true);
    expect(take.mock.calls.map(([c]) => c.buckets[0]?.key)).toEqual(['send:phone:+966500000001', 'send:phone:+966500000001:day']);
  });

  it('an issue the issuer refuses (no pepper, the phone over its login_codes limits) spends no bucket', async () => {
    const off = signInWorld({ pepper: null });
    const offTake = vi.spyOn(off.limitStore, 'take');
    expect(await off.kit.issue(TARGET)).toBe(false);
    expect(offTake).not.toHaveBeenCalled();
    const busy = signInWorld();
    vi.spyOn(busy.codes, 'phoneStats').mockResolvedValue({ sentLast15Min: 3, sentLastDay: 3, failedLastDay: 0 });
    const busyTake = vi.spyOn(busy.limitStore, 'take');
    expect(await busy.kit.issue(TARGET)).toBe(false);
    expect(busyTake).not.toHaveBeenCalled();
  });

  it('a full bucket stops the send before any code row is written', async () => {
    const w = signInWorld();
    vi.spyOn(w.limitStore, 'take').mockResolvedValue(false);
    const insert = vi.spyOn(w.codes, 'insert');
    expect(await w.kit.issue(TARGET)).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(w.send.sent).toEqual([]);
  });
});
