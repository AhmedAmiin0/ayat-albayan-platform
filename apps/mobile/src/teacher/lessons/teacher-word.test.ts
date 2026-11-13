import { counted } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { lesson, yusuf } from '@/today/testing/fixtures';
import { teacherWord } from './teacher-word';

// 16:00–16:45 Riyadh on 1 Oct 2026.
const base = lesson({ id: 'l' });
const at = (iso: string) => new Date(iso);

test('ahead: «بانتظار تأكيدك», then «حضورك مؤكَّد» once she said she will attend', () => {
  expect(teacherWord(base, at('2026-10-01T12:00:00Z'))).toEqual({
    label: t.teacherToday.awaiting,
    tone: 'act',
    glyph: 'hollow',
  });
  const confirmed = { ...base, teacher_confirmed_at: '2026-10-01T11:00:00Z' };
  expect(teacherWord(confirmed, at('2026-10-01T12:00:00Z'))?.label).toBe(
    t.teacherBoard.confirmedChip,
  );
});

test('under way: «جارية الآن»; after the end with no report: «اكتب التقرير»', () => {
  expect(teacherWord(base, at('2026-10-01T13:10:00Z'))?.label).toBe(t.today.running);
  expect(teacherWord(base, at('2026-10-01T14:00:00Z'))?.label).toBe(t.reports.open);
});

test('a draft: «أكمل التقرير»; a sent report in its window counts the minutes to the send', () => {
  const now = at('2026-10-01T14:00:00Z');
  const draft = { ...yusuf, report: { id: 'r', status: 'draft' as const } };
  expect(teacherWord({ ...base, students: [draft] }, now)?.label).toBe(t.reports.resume);
  const report = {
    id: 'r',
    status: 'submitted' as const,
    sent_at: null,
    edit_until: '2026-10-01T14:12:00Z',
  };
  const word = teacherWord({ ...base, students: [{ ...yusuf, report }] }, now);
  const when = counted(t.settingsValues.units.minutes, 12);
  expect(word).toEqual({
    label: t.reports.familySend.sendsIn.replace('{when}', when),
    tone: 'neutral',
    glyph: 'half',
  });
});

test('held, sent, or past its window: null (the lesson-status chip speaks)', () => {
  const now = at('2026-10-01T15:00:00Z');
  const sent = { id: 'r', status: 'submitted' as const, sent_at: '2026-10-01T14:30:00Z' };
  expect(teacherWord({ ...base, students: [{ ...yusuf, report: sent }] }, now)).toBeNull();
  expect(teacherWord({ ...base, status: 'cancelled_by_admin' }, now)).toBeNull();
});

test('a group: a closed window does not count down to the past; the open one does', () => {
  const now = at('2026-10-01T14:00:00Z');
  const sub = (edit_until: string) => ({ id: edit_until, status: 'submitted' as const, edit_until });
  const closed = { ...yusuf, id: 's-a', report: { ...sub('2026-10-01T13:50:00Z'), sent_at: null } };
  const open = { ...yusuf, id: 's-b', report: { ...sub('2026-10-01T14:07:00Z'), sent_at: null } };
  const word = teacherWord({ ...base, students: [closed, open] }, now);
  const when = counted(t.settingsValues.units.minutes, 7);
  expect(word?.label).toBe(t.reports.familySend.sendsIn.replace('{when}', when));
});
