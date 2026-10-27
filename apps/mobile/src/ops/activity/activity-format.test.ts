import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import {
  actionLabel,
  actorLine,
  entityLabel,
  formatAt,
  metaLine,
  resultLabel,
  resultStyle,
  roleLabel,
} from './activity-format';

test('an exact label, else verb + entity, else the raw key', () => {
  expect(actionLabel('expenses.create', 'expenses')).toBe(t.activity.actions.expenses.create);
  expect(actionLabel('leads.update', 'leads')).toBe(
    `${t.activity.verbs.update} ${t.activity.entities.leads}`,
  );
  expect(actionLabel('weird.thing', null)).toBe('weird.thing');
});

test('roles and entities fall back to the raw word', () => {
  expect(roleLabel('teacher')).toBe(t.activity.roles.teacher);
  expect(roleLabel('martian')).toBe('martian');
  expect(entityLabel('students')).toBe(t.activity.entities.students);
  expect(entityLabel('zzz')).toBe('zzz');
});

test('the actor: name and role; a missing name is «غير معروف»', () => {
  expect(actorLine({ actor_name: 'منى', actor_role: 'admin' })).toBe(
    `${isolate('منى')} · ${t.activity.roles.admin}`,
  );
  expect(actorLine({ actor_name: null, actor_role: 'public' })).toBe(
    `${t.activity.unknownUser} · ${t.activity.roles.public}`,
  );
});

test('results: ok below 400, an error with its status from 400', () => {
  expect(resultStyle(201)).toEqual({ tone: 'ok', glyph: 'fill' });
  expect(resultStyle(403).tone).toBe('bad');
  expect(resultLabel(204)).toBe(t.activity.ok);
  expect(resultLabel(403)).toBe(t.activity.error.replace('{status}', '403'));
});

test('time reads in Riyadh (UTC+3), 24 h, Western digits', () => {
  // 13:30Z is 16:30 in Riyadh.
  expect(formatAt('2026-10-04T13:30:00Z', '24')).toMatch(/16:30/);
  expect(formatAt('2026-10-04T13:30:00Z', '24')).not.toMatch(/[٠-٩]/);
  expect(metaLine({ entity: 'students', at: '2026-10-04T13:30:00Z' }, '24')).toContain(
    t.activity.entities.students,
  );
  expect(metaLine({ entity: null, at: '2026-10-04T13:30:00Z' }, '24')).not.toContain('·');
});
