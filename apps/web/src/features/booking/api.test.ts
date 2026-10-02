import { describe, expect, it } from 'vitest';
import { bookingTeachersQuery, parseBookSearch } from './api';

describe('parseBookSearch (/admin/book)', () => {
  it('a student id wins over a lead', () => {
    expect(parseBookSearch({ studentId: 's1', leadId: 'l1', phone: '+966' })).toEqual({ studentId: 's1' });
  });

  it('keeps the lead id with its phone and name, drops blanks and non-strings', () => {
    expect(parseBookSearch({ leadId: 'l1', phone: ' +966501234567 ', name: '' })).toEqual({
      leadId: 'l1',
      phone: '+966501234567',
    });
    expect(parseBookSearch({ leadId: 3, studentId: null })).toEqual({});
  });

  it('keeps a lead’s package size («اشترك» from the chat), parsed or raw; drops unknown ones', () => {
    expect(parseBookSearch({ leadId: 'l1', pkg: 8 })).toEqual({ leadId: 'l1', pkg: '8' });
    expect(parseBookSearch({ leadId: 'l1', pkg: 'trial' })).toEqual({ leadId: 'l1', pkg: 'trial' });
    expect(parseBookSearch({ leadId: 'l1', pkg: '9' })).toEqual({ leadId: 'l1' });
    expect(parseBookSearch({ studentId: 's1', pkg: '8' })).toEqual({ studentId: 's1' });
  });
});

describe('bookingTeachersQuery', () => {
  it('filters by program, and by gender only when one is chosen', () => {
    expect(bookingTeachersQuery({ program: 'quran', gender: null }).queryKey.at(-1)).toBe('program=quran');
    expect(bookingTeachersQuery({ program: 'arabic', gender: 'female' }).queryKey.at(-1)).toBe(
      'program=arabic&gender=female',
    );
  });
});
