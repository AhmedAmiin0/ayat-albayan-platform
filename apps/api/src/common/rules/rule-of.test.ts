import { describe, expect, it } from 'vitest';
import { fakeRulesReader } from '../../modules/notification-rules/policy.fakes';
import { ruleOf, timingOf } from './rule-of';

describe('ruleOf / timingOf', () => {
  it('legacy mode: the legacy settings decide the mapped parts', async () => {
    const snap = await fakeRulesReader({ settings: { reminder_minutes_before: 45 } }).snapshot();
    const rule = ruleOf(snap, 'lesson_reminder');
    expect(rule.enabled).toBe(true);
    expect(timingOf(rule, 'lesson_reminder')).toEqual({ minutes_before: 45 });
  });

  it('module mode: the row decides', async () => {
    const rows = [{ key: 'lesson_reminder_24h', enabled: true, timing: { send_at_local: '20:00' } }];
    const snap = await fakeRulesReader({ mode: 'module', rows }).snapshot();
    const rule = ruleOf(snap, 'lesson_reminder_24h');
    expect(rule.enabled).toBe(true);
    expect(timingOf(rule, 'lesson_reminder_24h')).toEqual({ send_at_local: '20:00' });
  });

  it('a timing that does not fit the key reads as null', async () => {
    const snap = await fakeRulesReader().snapshot();
    expect(timingOf(ruleOf(snap, 'lesson_reminder'), 'follow_up_slots')).toBeNull();
  });
});
