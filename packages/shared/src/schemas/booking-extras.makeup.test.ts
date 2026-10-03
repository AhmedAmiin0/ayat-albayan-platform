import { describe, expect, it } from 'vitest';
import { makeupNames } from '../messaging/booking-confirmation.js';
import { makeupEligible, type MakeupOriginal } from './booking-extras.js';

describe('makeupEligible: only a charged student miss within 60 days', () => {
  const now = new Date('2026-10-03T10:00:00Z');
  const miss: MakeupOriginal = {
    status: 'no_show',
    chargeable: true,
    trial: false,
    makeup: false,
    startsAt: '2026-09-30T10:00:00Z',
  };
  it.each([
    ['no_show', {}, 'ok'],
    ['an excuse that counted', { status: 'excused' }, 'ok'],
    ['an excuse in time', { status: 'excused', chargeable: false }, 'not_charged'],
    ['completed', { status: 'completed' }, 'status'],
    ['cancelled by the teacher', { status: 'cancelled_by_teacher', chargeable: false }, 'status'],
    ['cancelled by the admin', { status: 'cancelled_by_admin', chargeable: false }, 'status'],
    ['rescheduled', { status: 'rescheduled', chargeable: false }, 'status'],
    ['still scheduled', { status: 'scheduled' }, 'status'],
    ['a trial', { trial: true }, 'trial'],
    ['a makeup itself', { makeup: true }, 'is_makeup'],
    ['exactly 60 days ago', { startsAt: '2026-08-04T10:00:00Z' }, 'ok'],
    ['60 days and a second ago', { startsAt: '2026-08-04T09:59:59Z' }, 'too_old'],
  ] as const)('%s → %s', (_name, over, verdict) => {
    expect(makeupEligible({ ...miss, ...over }, now)).toBe(verdict);
  });
});

describe('makeupNames: {{1}} of the confirmation', () => {
  it('Arabic: «تعويضية لـسهيلة ومريم»', () => {
    expect(makeupNames(['سهيلة'])).toBe('تعويضية لـسهيلة');
    expect(makeupNames(['سهيلة', 'مريم'])).toBe('تعويضية لـسهيلة ومريم');
  });

  it('a name with the article «ال» takes «لل», not «لـال»', () => {
    expect(makeupNames(['الزهراء'])).toBe('تعويضية للزهراء');
    expect(makeupNames(['العنود', 'مريم'])).toBe('تعويضية للعنود ومريم');
  });
  it('English for an English screen', () => {
    expect(makeupNames(['Suhaila'], 'en')).toBe('makeup for Suhaila');
  });
});
