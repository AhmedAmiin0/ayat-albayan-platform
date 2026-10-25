import { ESSENTIAL_OFF_TEXT } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { canManageNotifications, ruleFailure } from './rules-api';
import { approvalWord, failureText, isFamilyFacing, reachText, reasonText, timingText } from './rule-text';

const r = t.notificationRules;
const REACH = { guardian: 12, teacher: 3, lead: 25 };

describe('«الإشعارات» words', () => {
  it('timings in words; null where the row has none', () => {
    expect(timingText('lesson_reminder', { minutes_before: 45 })).toBe(r.timing.minutesText.replace('{n}', '45'));
    expect(timingText('teacher_lesson_reminder', { minutes_before: null })).toBe(r.timing.sameAsFamily);
    expect(timingText('lesson_reminder_24h', { send_at_local: null })).toBe(r.timing.dayBeforeSame);
    expect(timingText('lesson_reminder_24h', { send_at_local: '20:00' })).toBe(r.timing.dayBeforeText.replace('{time}', '20:00'));
    expect(timingText('follow_up_slots', { hours: [24, 72], slots_from_hours: 12, slots_to_days: 7 })).toContain('24، 72');
    expect(timingText('report_ready', null)).toBeNull();
  });

  it('reach: guardians and leads counted; zero says nobody; no counts says «كل …»', () => {
    expect(reachText({ audience: 'guardian' }, REACH)).toBe(r.familyOn.guardian.other.replace('{n}', '12'));
    expect(reachText({ audience: 'guardian' }, { ...REACH, guardian: 1 })).toBe(r.familyOn.guardian.one);
    expect(reachText({ audience: 'lead' }, { ...REACH, lead: 5 })).toBe(r.familyOn.lead.few.replace('{n}', '5'));
    expect(reachText({ audience: 'lead' }, { ...REACH, lead: 0 })).toBe(r.familyOn.nobody);
    expect(reachText({ audience: 'guardian' }, undefined)).toBe(r.familyOn.guardianAll);
    expect(isFamilyFacing({ audience: 'lead' })).toBe(true);
    expect(isFamilyFacing({ audience: 'teacher' })).toBe(false);
  });

  it('approval: all / some («معتمد جزئيًا») / none / no template; v1 falls back on the statuses', () => {
    expect(approvalWord({ approval: 'some', templates: [] })).toEqual({ word: r.approval.some, partly: true });
    expect(approvalWord({ approval: 'all', templates: [] }).word).toBe(r.approval.all);
    expect(approvalWord({ approval: 'none', templates: [] }).word).toBe(r.approval.none);
    expect(approvalWord({ approval: null, templates: [] }).word).toBe(r.approval.noTemplate);
    expect(approvalWord({ templates: [{ key: 'x', status: 'approved', line: null }] }).word).toBe(r.approval.all);
  });

  it('the reason includes classroom_off', () => {
    expect(reasonText({ blocker: 'classroom_off' })).toBe(r.blockers.classroom_off);
    expect(reasonText({ blocker: 'messaging_off' })).toBe(t.notificationCatalogue.blockers.messaging_off);
    expect(reasonText({ blocker: null })).toBeNull();
  });
});

describe('save errors and the permission', () => {
  it('428 / 422 / 403 / others', () => {
    expect(ruleFailure(new ApiError(428, { message: 'confirmation_required' }))).toBe('confirmation_required');
    expect(ruleFailure(new ApiError(422, { message: 'locked' }))).toBe('locked');
    expect(ruleFailure(new ApiError(422, { message: 'unknown_number' }))).toBe('unknown_number');
    expect(ruleFailure(new ApiError(422, { message: 'weird' }))).toBe('invalid');
    expect(ruleFailure(new ApiError(403))).toBe('forbidden');
    expect(ruleFailure(new ApiError(500))).toBe('failed');
    expect(ruleFailure(new Error('x'))).toBe('failed');
    expect(failureText('confirmation_required')).toContain(ESSENTIAL_OFF_TEXT);
  });

  it('notifications.manage edits; settings.write alone does not', () => {
    expect(canManageNotifications(['notifications.manage'])).toBe(true);
    expect(canManageNotifications(['settings.read', 'settings.write'])).toBe(false);
  });
});
