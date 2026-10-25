import type { NotificationEntryView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { catalogue } from '../fixtures';
import { sentCounts } from './sent-counts';

const base = catalogue.entries.find((e) => !e.manual && e.audience === 'guardian');
if (!base) throw new Error('fixture has no guardian row');
const row = (over: Partial<NotificationEntryView>): NotificationEntryView => ({ ...base, ...over });

test('counts on / not sent per audience, in the pills order, with their labels', () => {
  const entries = [
    row({ key: 'report_ready', audience: 'guardian', state: 'on' }),
    row({ key: 'lesson_reminder', audience: 'guardian', state: 'off', blocker: 'auto_off' }),
    row({ key: 'renewal_due', audience: 'guardian', state: 'off' }),
    row({ key: 'teacher_new_student', audience: 'teacher', state: 'on' }),
  ];
  const c = t.notificationCatalogue.audience;
  expect(sentCounts(entries)).toEqual([
    { audience: 'guardian', label: c.guardian, on: 1, off: 2 },
    { audience: 'teacher', label: c.teacher, on: 1, off: 0 },
    { audience: 'lead', label: c.lead, on: 0, off: 0 },
    { audience: 'staff', label: c.staff, on: 0, off: 0 },
  ]);
});

test('manual rows (sent by a person) and keys this build does not know are left out', () => {
  const entries = [
    row({ key: 'report_ready', state: 'on' }),
    row({ key: 'report_ready', manual: true, state: 'manual' }),
    { ...row({ state: 'on' }), key: 'future_key' } as unknown as NotificationEntryView,
  ];
  const rows = sentCounts(entries);
  expect(rows.map((r) => r.audience)).toEqual(['guardian', 'teacher', 'lead', 'staff']);
  expect(rows[0]).toMatchObject({ on: 1, off: 0 });
});

test('the fixture catalogue: every audience counted, totals match the automatic rows', () => {
  const rows = sentCounts(catalogue.entries);
  const auto = catalogue.entries.filter((e) => !e.manual).length;
  expect(rows.reduce((sum, r) => sum + r.on + r.off, 0)).toBe(auto);
});
