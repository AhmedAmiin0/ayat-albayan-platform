import { t } from '@/core/lib/i18n/i18n';
import { jana, lesson, yusuf } from '@/today/testing/fixtures';
import { heroLine, studentClocks } from './lesson-lines';

const CAIRO = { tz: 'Africa/Cairo', cycle: '24' as const };
// 16:00 Riyadh = 16:00 Cairo (summer) on 1 Oct 2026; Muscat is an hour ahead (17:00).
const both = lesson({ id: 'l', students: [yusuf, jana] });

test('studentClocks: one «عند الطالب» per zone whose clock differs from hers', () => {
  expect(studentClocks(both, CAIRO)).toBe(t.teacherDash.studentTime.replace('{time}', '17:00'));
  expect(studentClocks(lesson({ id: 'r' }), CAIRO)).toBe('');
});

test('heroLine: the kind first, the length, then the students’ own clocks', () => {
  const line = heroLine({ ...both, trial: true }, CAIRO);
  expect(line.startsWith(`${t.schedule.trialTag} · ${t.enums.duration['45']}`)).toBe(true);
  expect(line).toContain('17:00');
  expect(heroLine(lesson({ id: 'm', makeup: true }), CAIRO)).toBe(
    `${t.booking.makeup.tag} · ${t.enums.duration['45']}`,
  );
});
