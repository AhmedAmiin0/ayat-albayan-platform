import type { NotificationRuleView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { draftOf, draftResult, isDirty } from './rule-draft';

const r = t.notificationRules;
const rule = (patch: Partial<NotificationRuleView> = {}): NotificationRuleView => ({
  key: 'teacher_lesson_reminder',
  enabled: true,
  channels: ['whatsapp'],
  timing: { minutes_before: null },
  number_id: null,
  editable: true,
  optional_channels: ['bell', 'push'],
  updated_at: null,
  updated_by: null,
  ...patch,
});
const numberName = (id: string | null) => (id === null ? r.templateNumber : `#${id}`);

describe('a row draft → the PATCH body (only what changed)', () => {
  it('unchanged: no body, not dirty', () => {
    const base = rule();
    const result = draftResult({ rule: base, draft: draftOf(base), numberName });
    expect(result).toEqual({ ok: true, patch: {}, changes: [] });
    expect(isDirty(result)).toBe(false);
  });

  it('timing, channels and number each alone, with their «… بدلًا من …» words', () => {
    const base = rule();
    const timed = draftResult({ rule: base, draft: { ...draftOf(base), timing: { kind: 'teacher_lesson_reminder', minutes: '30', same: false } }, numberName });
    expect(timed).toMatchObject({ ok: true, patch: { timing: { minutes_before: 30 } } });
    expect(timed.ok && timed.changes[0]).toBe(
      r.insteadOf.replace('{new}', r.timing.minutesText.replace('{n}', '30')).replace('{old}', r.timing.sameAsFamily),
    );
    // Channels go out in catalogue order whatever order they were ticked in.
    const channels = draftResult({ rule: base, draft: { ...draftOf(base), channels: ['push', 'whatsapp'] }, numberName });
    expect(channels).toMatchObject({ ok: true, patch: { channels: ['whatsapp', 'push'] } });
    const number = draftResult({ rule: base, draft: { ...draftOf(base), number_id: 'n1' }, numberName });
    expect(number).toEqual({ ok: true, patch: { number_id: 'n1' }, changes: [r.insteadOf.replace('{new}', '#n1').replace('{old}', r.templateNumber)] });
  });

  it('the same channels in another order are not a change; an unparsable timing is dirty with its reason', () => {
    const base = rule({ channels: ['whatsapp', 'push'] });
    expect(draftResult({ rule: base, draft: { ...draftOf(base), channels: ['push', 'whatsapp'] }, numberName })).toMatchObject({ patch: {} });
    const bad = draftResult({ rule: base, draft: { ...draftOf(base), timing: { kind: 'teacher_lesson_reminder', minutes: '1', same: false } }, numberName });
    expect(bad).toEqual({ ok: false, error: r.errors.minutes });
    expect(isDirty(bad)).toBe(true);
  });

  it('rows without a timing of their own have no timing draft', () => {
    expect(draftOf(rule({ key: 'report_ready', timing: null })).timing).toBeNull();
  });
});
