import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import { ACTIVITY_ROLES, SHORT_LINK_AUDIENCES, SHORT_LINK_SEND_STATUSES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { GATE_SCREENS } from './gate-screen';
import { GATE_CODE_ERRORS, GATE_PHONE_ERRORS } from './gate-steps';
import { expiryParts, expiryText, type ExpiryWords } from './link-expiry';
import { LINK_ERRORS } from './link-form-errors';
import { usageText, type UsageWords } from './link-format';

// Every key the short-link logic hands the apps has words in ar.json and en.json.

const keysOf = (o: object): string[] => Object.keys(o).sort();

describe.each([['ar', ar], ['en', en]] as const)('%s.json shortLinks', (_lang, t) => {
  const s = t.shortLinks;

  it('words every state, send status, audience and error', () => {
    expect(keysOf(s.state)).toEqual(['active', 'expired', 'full', 'revoked']);
    expect(keysOf(s.send)).toEqual([...SHORT_LINK_SEND_STATUSES].sort());
    expect(keysOf(s.audience)).toEqual([...SHORT_LINK_AUDIENCES].sort());
    expect(keysOf(s.form.errors)).toEqual([...LINK_ERRORS].sort());
    const gateErrors = new Set([...GATE_PHONE_ERRORS, ...GATE_CODE_ERRORS]);
    expect(keysOf(s.gate.errors)).toEqual([...gateErrors].sort());
    for (const role of [...ACTIVITY_ROLES, 'unknown'] as const) {
      expect(t.activity.roles[role]).toBeTruthy();
    }
    expect(t.nav.shortLinks).toBeTruthy();
  });

  it('has a title and body for every dead-end gate screen', () => {
    const words: Record<string, unknown> = s.gate;
    for (const screen of ['full', 'restricted', 'expired', 'revoked', 'notFound']) {
      expect(words[`${screen}Title`]).toEqual(expect.any(String));
      expect(words[`${screen}Body`]).toEqual(expect.any(String));
    }
    expect(GATE_SCREENS).toContain('not_found');
  });

  it('fills the usage and expiry words', () => {
    const usage: UsageWords = s.list;
    expect(usageText({ maxUsers: 12, visitors: 7 }, usage)).toMatch(/7.*12/);
    const words: ExpiryWords = s.expiry;
    const clock = { now: new Date('2026-11-17T11:00:00Z'), tz: 'Asia/Riyadh', purgeDays: 30 };
    const parts = expiryParts({ status: 'expired', expiresAt: '2026-11-10T11:00:00Z' }, clock);
    expect(expiryText(parts, { words, date: (iso) => iso.slice(0, 10) })).toMatch(/2026-12-10/);
  });
});
