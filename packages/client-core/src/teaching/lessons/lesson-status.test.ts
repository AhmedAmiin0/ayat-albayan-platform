import { lessonStatusStyle } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  canCorrectAutoHeld,
  lessonStatusLabel,
  lessonStatusLook,
  UPCOMING_LESSON_STYLE,
} from './lesson-status.js';

const words = {
  labels: {
    scheduled: 'يحتاج تأكيد',
    confirmed: 'مؤكدة',
    completed: 'انعقدت',
    late: 'متأخر',
    excused: 'اعتذر',
    no_show: 'غياب',
    cancelled_by_teacher: 'ألغاها المعلم',
    cancelled_by_admin: 'ألغتها الإدارة',
    rescheduled: 'نُقلت',
  },
  upcoming: 'مجدولة',
};

describe('lesson status words and look (owner 2026-11-02)', () => {
  it('no confirmation required: a scheduled lesson reads as upcoming, neutral', () => {
    expect(lessonStatusLabel('scheduled', false, words)).toBe('مجدولة');
    expect(lessonStatusLook('scheduled', false)).toEqual(UPCOMING_LESSON_STYLE);
  });

  it('confirmation required: «يحتاج تأكيد» and its «دورك» look, exactly as before', () => {
    expect(lessonStatusLabel('scheduled', true, words)).toBe('يحتاج تأكيد');
    expect(lessonStatusLook('scheduled', true)).toEqual(lessonStatusStyle.scheduled);
  });

  it('every other status is unchanged either way', () => {
    for (const required of [true, false]) {
      expect(lessonStatusLabel('confirmed', required, words)).toBe('مؤكدة');
      expect(lessonStatusLook('completed', required)).toEqual(lessonStatusStyle.completed);
    }
  });

  it('only a completed lesson flagged auto_held may be corrected', () => {
    expect(canCorrectAutoHeld({ status: 'completed', auto_held: true })).toBe(true);
    expect(canCorrectAutoHeld({ status: 'completed' })).toBe(false);
    expect(canCorrectAutoHeld({ status: 'cancelled_by_teacher', auto_held: true })).toBe(false);
  });
});
