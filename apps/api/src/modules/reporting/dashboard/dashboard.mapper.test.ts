import { LEAD_STATUSES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { countBy, sourceRows, teacherLoad } from './dashboard.mapper';

describe('countBy (numbers from statuses, issue F3)', () => {
  it('every status is present, zero when none', () => {
    const funnel = countBy(LEAD_STATUSES, ['new', 'new', 'converted']);
    expect(funnel).toEqual({
      new: 2,
      contacted: 0,
      interested_no_slot: 0,
      trial_booked: 0,
      trial_done: 0,
      converted: 1,
      no_reply: 0,
      lost: 0,
    });
  });
});

describe('teacherLoad', () => {
  it('occupying lessons and trial/active assigned students per active teacher, in the given order', () => {
    const load = teacherLoad({
      teachers: [
        { id: 't1', display_name_ar: 'أبرار', max_students: 12 },
        { id: 't2', display_name_ar: 'فاطمة', max_students: null },
      ],
      lessons: [
        { status: 'scheduled', teacher_id: 't1' },
        { status: 'completed', teacher_id: 't1' },
        { status: 'cancelled_by_admin', teacher_id: 't1' },
        { status: 'excused', teacher_id: 't1' },
        { status: 'no_show', teacher_id: 't2' },
        { status: 'confirmed', teacher_id: 'gone' },
      ],
      students: [{ teacher_id: 't1' }, { teacher_id: 't1' }, { teacher_id: null }],
    });
    expect(load).toEqual([
      { teacher_id: 't1', display_name_ar: 'أبرار', lessons: 2, students: 2, max_students: 12 },
      { teacher_id: 't2', display_name_ar: 'فاطمة', lessons: 1, students: 0, max_students: null },
    ]);
  });
});

describe('sourceRows (R-RPT-02, issue E4)', () => {
  it('leads and converted per lead source, money per payer source, margin = revenue − cost', () => {
    const rows = sourceRows(
      [
        { source: 'facebook_ad', status: 'converted' },
        { source: 'facebook_ad', status: 'new' },
        { source: 'referral', status: 'lost' },
      ],
      new Map([['facebook_ad', { revenue: 290, teacher_cost: 20.004 }]]),
    );
    expect(rows.map((r) => r.source)).toEqual(['facebook_ad', 'instagram_ad', 'whatsapp_direct', 'referral', 'other']);
    expect(rows[0]).toEqual({ source: 'facebook_ad', leads: 2, converted: 1, revenue: 290, teacher_cost: 20, gross_margin: 270 });
    expect(rows[3]).toMatchObject({ source: 'referral', leads: 1, converted: 0, revenue: 0 });
  });

  it('unknown appears only when a guardian without a source brought money', () => {
    const rows = sourceRows([], new Map([['unknown', { revenue: 0, teacher_cost: 5 }]]));
    expect(rows.at(-1)).toEqual({ source: 'unknown', leads: 0, converted: 0, revenue: 0, teacher_cost: 5, gross_margin: -5 });
  });
});
