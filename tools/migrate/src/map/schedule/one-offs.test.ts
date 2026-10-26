// One-off bookings (no «التكرار») on or after --from → one upcoming lesson + its student link.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { studentRow } from '../../sources/sheets/fixtures.ts';
import { LAYAN, booking, runBookings } from './bookings.fixture.ts';

const once = (fields: Parameters<typeof booking>[0]) =>
  booking({ recurrence: null, date: '2026-11-02', start_time: '17:30', ...fields });

describe('one-off bookings', () => {
  it('a future trial becomes one scheduled, unconfirmed, non-chargeable lesson', () => {
    const r = runBookings({ bookings: [once({ package_text: 'حلقة تجريبية مجانية' })] });
    const at = '2026-11-02T14:30:00.000Z'; // 17:30 Asia/Riyadh
    const key = keys.lesson({ teacher: 'abrar', students: [LAYAN.key], at });
    expect(r.by('lessons').map((d) => [d.key, d.record])).toEqual([
      [
        key,
        {
          columns: { starts_at: at, ends_at: '2026-11-02T15:00:00.000Z' },
          refs: { teacher_id: keys.teacher('abrar') },
        },
      ],
    ]);
    expect(r.by('lessons')[0]?.record.columns).not.toHaveProperty('confirmed_at');
    expect(r.by('lesson_students').map((d) => d.record)).toEqual([
      { columns: { chargeable: false }, refs: { lesson_id: key, student_id: LAYAN } },
    ]);
    expect(r.by('schedule_rules')).toEqual([]);
  });

  it('confirmed and subscribed one-offs too; a paid lesson is chargeable', () => {
    const r = runBookings({
      bookings: [once({ status: 'مؤكد' }), once({ status: 'مشترك', date: '2026-11-09' })],
    });
    expect(r.by('lessons')).toHaveLength(2);
    expect(r.by('lesson_students').map((d) => d.record.columns)).toEqual([
      { chargeable: true },
      { chargeable: true },
    ]);
  });

  it('a one-off dated before --from creates nothing; one on --from does', () => {
    const r = runBookings({
      from: '2026-11-02',
      bookings: [once({ date: '2026-10-30' }), once({ date: '2026-11-02' })],
    });
    expect(r.by('lessons').map((d) => d.record.columns['starts_at'])).toEqual([
      '2026-11-02T14:30:00.000Z',
    ]);
    expect(r.issues).toEqual([]);
  });

  it('teacher column: a known name wins, unknown text is rejected', () => {
    const r = runBookings({ bookings: [once({ teacher: 'Hend' }), once({ teacher: 'Someone' })] });
    expect(r.by('lessons').map((d) => d.record.refs['teacher_id']?.key)).toEqual(['hend']);
    expect(r.issues.map((i) => [i.entity, i.code])).toEqual([['lessons', 'unknown_teacher']]);
  });

  it('a student missing from «الطلاب» is reported as missing_ref, not guessed', () => {
    const r = runBookings({
      bookings: [once({ name: 'جنى', phone: '966551110009' })],
      students: [studentRow({})],
    });
    expect(r.by('lessons')).toEqual([]);
    expect(r.issues).toMatchObject([{ entity: 'lessons', code: 'missing_ref', field: 'student' }]);
  });
});
