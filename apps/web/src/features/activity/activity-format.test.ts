import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { actionLabel, entityLink, formatAt, resultLabel, resultStyle, roleLabel } from './activity-format';

describe('activity labels', () => {
  it('uses the exact label of a known action', () => {
    expect(actionLabel('expenses.create', 'expenses')).toBe(t.activity.actions.expenses.create);
    expect(actionLabel('authSession.loginFailed', null)).toBe(t.activity.actions.authSession.loginFailed);
  });

  it('falls back to «verb + entity», then to the raw key', () => {
    expect(actionLabel('guardians.update', 'guardians')).toBe(`${t.activity.verbs.update} ${t.activity.entities.guardians}`);
    expect(actionLabel('lessonActions.reopen', 'lessons')).toBe('lessonActions.reopen');
    expect(actionLabel('weird', null)).toBe('weird');
  });

  it('labels roles and results; unknown roles show raw', () => {
    expect(roleLabel('public')).toBe(t.activity.roles.public);
    expect(roleLabel('robot')).toBe('robot');
    expect(resultLabel(201)).toBe(t.activity.ok);
    expect(resultLabel(404)).toBe(t.activity.error.replace('{status}', '404'));
    expect(resultStyle(500).tone).toBe('bad');
    expect(resultStyle(204).tone).toBe('ok');
  });
});

describe('formatAt / entityLink', () => {
  it('shows the time in the academy zone (Riyadh, UTC+3), 24h', () => {
    expect(formatAt('2026-10-05T21:30:00Z')).toMatch(/00:30/);
  });

  it('links students and teachers to their profiles only', () => {
    expect(entityLink('students', 's1')).toEqual({ to: '/admin/students/$studentId', params: { studentId: 's1' } });
    expect(entityLink('teachers', 't1')).toEqual({ to: '/admin/teachers/$teacherId', params: { teacherId: 't1' } });
    expect(entityLink('expenses', 'e1')).toBeNull();
    expect(entityLink('students', null)).toBeNull();
  });
});
