import { describe, expect, it } from 'vitest';
import { teachersLine } from '@/features/schedule/WeekSummary/week-summary.helpers';

const teacher = (name: string) => ({ id: name, display_name_ar: name, display_name_en: null });

describe('teachersLine', () => {
  it('joins the teachers in their order with a middle dot', () => {
    expect(teachersLine([teacher('فاطمة'), teacher('مريم')])).toBe('فاطمة · مريم');
  });

  it('one teacher: the name alone; none: an empty line', () => {
    expect(teachersLine([teacher('فاطمة')])).toBe('فاطمة');
    expect(teachersLine([])).toBe('');
  });
});
