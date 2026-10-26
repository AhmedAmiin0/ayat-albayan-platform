import { describe, expect, it, vi } from 'vitest';
import { fakePolicy } from '../../modules/notification-rules/policy/policy.fakes';
import { gateConfirmations, isConfirmation } from './confirmations';

const confirmation = { template_key: 'booking_confirmation_meet', dedup_key: 'booking_confirmation:l1:g1' };
const other = { template_key: 'lesson_cancelled', dedup_key: 'x' };
const OFF = { mode: 'module' as const, rows: [{ key: 'booking_confirmation', enabled: false }] };

describe('gateConfirmations (W1–W3)', () => {
  it('knows the three confirmation templates only', () => {
    expect(['booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain'].every((k) => isConfirmation({ template_key: k }))).toBe(true);
    expect(isConfirmation(other)).toBe(false);
    expect(isConfirmation(null)).toBe(false);
    expect(isConfirmation({})).toBe(false);
  });

  it('legacy, no rows (default on): the messages unchanged', async () => {
    expect(await gateConfirmations(fakePolicy(), [confirmation, other])).toEqual([confirmation, other]);
  });

  it('the rule off: the confirmations dropped, other rows kept', async () => {
    expect(await gateConfirmations(fakePolicy(OFF), [confirmation, other])).toEqual([other]);
  });

  it('rules unreadable: fail closed, no confirmation', async () => {
    expect(await gateConfirmations(fakePolicy({ fail: true }), [confirmation])).toEqual([]);
  });

  it('no confirmation among them: the rule is not even read', async () => {
    const policy = fakePolicy({ fail: true });
    const spy = vi.spyOn(policy, 'isOn');
    expect(await gateConfirmations(policy, [other])).toEqual([other]);
    expect(spy).not.toHaveBeenCalled();
  });
});
