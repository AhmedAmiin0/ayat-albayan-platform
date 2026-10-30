import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/payments/format';
import { ltr } from '@/core/ui/primitives/Ltr';
import { entry, student, subscription, teacher } from '../testing/fixtures';
import {
  fill,
  guardianLine,
  historyLines,
  packageLabel,
  viewerDate,
  startsLine,
  statusLabel,
  studentSubtitle,
  subscriptionSubtitle,
  teacherLabel,
  teacherSubtitle,
} from './sales-text';

const sep = t.common.listSeparator;
const RIYADH = 'Asia/Riyadh';

test('fill replaces every named placeholder', () => {
  expect(fill('{a} / {b}', { a: '1', b: '2' })).toBe('1 / 2');
});

test('viewerDate is the Riyadh calendar day in Western digits', () => {
  expect(viewerDate('2026-09-30T22:30:00.000Z', RIYADH)).toBe('2026-10-01');
  expect(viewerDate('2026-09-30T20:59:00.000Z', RIYADH)).toBe('2026-09-30');
});

test('status and package words; unknown values as sent, none as a dash', () => {
  expect(statusLabel('active')).toBe(t.enums.subscriptionStatus.active);
  expect(statusLabel('from_the_future')).toBe('from_the_future');
  expect(statusLabel(null)).toBe('—');
  expect(packageLabel('8')).toBe(t.enums.packageSize['8']);
  expect(packageLabel('99')).toBe('99');
  expect(packageLabel(null)).toBe('—');
});

test('a subscription row reads package · status · lessons and its start day', () => {
  const sub = subscription();
  expect(subscriptionSubtitle(sub)).toBe(
    `${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active} · ${t.sales.subscriptions.lessons.replace('{n}', '8')}`,
  );
  expect(startsLine(sub)).toBe(t.sales.subscriptions.startsOn.replace('{date}', ltr('2026-10-01')));
  expect(startsLine(subscription({ starts_on: null }))).toBeUndefined();
});

test('a teacher reads gender · programs; no programs leaves the gender alone', () => {
  const programs = [t.enums.program.quran, t.enums.program.arabic].join(sep);
  expect(teacherSubtitle(teacher())).toBe(`${t.enums.gender.female} · ${programs}`);
  expect(teacherSubtitle(teacher({ programs: [] }))).toBe(t.enums.gender.female);
  expect(teacherLabel(teacher())).toBe('أبرار محمد');
});

test('a student reads teacher · program (or «بلا معلم») and the guardian line', () => {
  expect(studentSubtitle(student())).toBe(`أبرار محمد · ${t.enums.program.quran}`);
  expect(studentSubtitle(student({ teacher_name: null }))).toBe(`${t.sales.allStudents.noTeacher} · ${t.enums.program.quran}`);
  expect(guardianLine(student())).toBe(t.sales.mobile.guardianLine.replace('{name}', 'أحمد سالم'));
});

test('history lines: dates, lessons, status changes and payments with date, kind and amount', () => {
  const h = t.sales.history;
  const lines = historyLines(entry(), RIYADH);
  expect(lines.heading).toBe(`${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active}`);
  expect(lines.dates).toEqual([h.starts.replace('{date}', ltr('2026-10-01')), h.renews.replace('{date}', ltr('2026-11-01'))]);
  expect(lines.lessons).toBe(`${fill(h.used, { used: '3', total: '8' })} · ${h.remaining.replace('{n}', '5')}`);
  expect(lines.changes).toEqual([
    `${ltr('2026-09-30')} — ${h.created.replace('{to}', t.enums.subscriptionStatus.unpaid)}`,
    `${ltr('2026-10-01')} — ${fill(h.changed, { from: t.enums.subscriptionStatus.unpaid, to: t.enums.subscriptionStatus.active })}`,
  ]);
  expect(lines.payments).toEqual([`${ltr('2026-09-30')} — ${t.enums.paymentKind.payment} — ${money(145, 'SAR')}`]);
});

test('an ended subscription adds its end day', () => {
  const lines = historyLines(entry({ renews_on: null, ended_at: '2026-09-29T21:30:00.000Z' }), RIYADH);
  expect(lines.dates).toEqual([
    t.sales.history.starts.replace('{date}', ltr('2026-10-01')),
    t.sales.history.ended.replace('{date}', ltr('2026-09-30')),
  ]);
});
