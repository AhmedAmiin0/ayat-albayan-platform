import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesLessonDetails } from './SalesLessonDetails';

const AHEAD = new Date(Date.now() + 3_600_000).toISOString();

describe('SalesLessonDetails — «أكّد المعلم الحضور» (docs/46 C4)', () => {
  it('shows the chip once the teacher said «سأحضر»', () => {
    const lesson = scheduleLesson({ starts_at: AHEAD, teacher_confirmed_at: AHEAD });
    renderWithQuery(<SalesLessonDetails lesson={lesson} />);
    expect(screen.getByText(t.teacherBoard.teacherConfirmed)).toBeTruthy();
  });

  it('nothing before she confirms, or for an old cache without the field', () => {
    renderWithQuery(<SalesLessonDetails lesson={scheduleLesson({ starts_at: AHEAD })} />);
    expect(screen.queryByText(t.teacherBoard.teacherConfirmed)).toBeNull();
  });
});
