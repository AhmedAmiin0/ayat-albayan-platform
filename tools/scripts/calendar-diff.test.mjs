import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from './calendar-diff.mjs';
import { parseIcs, parseRrule, unfold } from './calendar-ics.mjs';
import { buildSql } from './calendar-sql.mjs';
import { studentOf, teacherOf, toSlots } from './calendar-slots.mjs';
import { MAIN_ICS, TEACHER_ICS } from './calendar.fixture.mjs';

test('ics: folded lines are joined; weekly rules read BYDAY, UNTIL and COUNT', () => {
  assert.deepEqual(unfold('SUMMARY:حلقة — سل\r\n مى'), ['SUMMARY:حلقة — سلمى']);
  assert.deepEqual(parseRrule('FREQ=WEEKLY;BYDAY=SA,TU;COUNT=16'), { freq: 'WEEKLY', byday: [6, 2], until: null, count: 16 });
});

test('ics: exception instances and cancelled events are dropped', () => {
  const { calendar, series } = parseIcs(TEACHER_ICS);
  assert.equal(calendar, 'آيات البيان — Testa');
  assert.equal(series.length, 4);
});

test('names: teacher from the calendar name, student from «حلقة — name (status)»', () => {
  assert.equal(teacherOf('آيات البيان — Testa'), 'Testa');
  assert.equal(teacherOf('أكاديمية آيات البيان'), null);
  assert.equal(studentOf('حلقة — مرام يحي (يحتاج تأكيد)'), 'مرام يحي');
});

test('slots: duplicate series collapse, UTC becomes Riyadh time, ended series and the main calendar are left out', () => {
  const { slots, skipped } = toSlots([parseIcs(TEACHER_ICS), parseIcs(MAIN_ICS)], '2026-10-03');
  const view = slots.map((s) => [s.student, s.weekday, s.at, s.minutes, s.series]);
  assert.deepEqual(view, [
    ['سلمى تجربة', 6, '08:00', 45, 2],
    ['سلمى تجربة', 2, '08:00', 45, 2],
    ['نور', 4, '16:00', 60, 1],
  ]);
  assert.deepEqual(skipped, { mainCalendar: 1, ended: 1, notWeekly: 0, allDay: 0 });
});

test('sql: report only (ROLLBACK), names quoted, the slots inserted', () => {
  const slots = [{ teacher: 'Testa', student: "O'Neil", weekday: 6, at: '08:00', tz: 'Asia/Riyadh', minutes: 45, series: 2 }];
  const sql = buildSql(slots, { calendars: 1, today: '2026-10-03', skipped: {} });
  assert.match(sql, /\('Testa', 'O''Neil', 6, '08:00', 'Asia\/Riyadh', 45, 2\)/);
  assert.match(sql.trim(), /rollback;$/);
  assert.doesNotMatch(sql, /\bcommit;/);
});

test('args: --today is read, the rest are paths', () => {
  assert.deepEqual(parseArgs(['a', '--today', '2026-10-03', 'b']), { today: '2026-10-03', paths: ['a', 'b'] });
  assert.throws(() => parseArgs(['--today', 'tomorrow']));
});
