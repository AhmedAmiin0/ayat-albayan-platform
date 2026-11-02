import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ABRAR, FATMA, lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { WeekAgenda } from './WeekAgenda';

const DAY = '2026-10-04';
const row = (teacher: typeof ABRAR) => ({ id: teacher.id, teacher, name: teacher.display_name_ar, days: new Map([[DAY, [lesson()]]]) });

describe('WeekAgenda (the week on a phone)', () => {
  it('names each teacher in their own text beside the initials circle, so the name reads alone', () => {
    render(<WeekAgenda days={[DAY]} today={DAY} rows={[row(ABRAR), row(FATMA)]} onOpen={() => undefined} />);
    expect(screen.getByText(ABRAR.display_name_ar, { exact: true }).tagName).toBe('SPAN');
    expect(screen.getByText(FATMA.display_name_ar, { exact: true })).toBeTruthy();
  });
});
