import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeacherLessonCard } from '@/features/teaching/teacher/lessons/TeacherLessonCard';
import { t } from '@/lib/i18n/i18n';
import { JOUD, lesson, SUHAILA } from './lesson-fixture';
import { LessonChip } from './LessonChip';
import { LessonDetails } from './LessonDetails';

// R-SUB-02: the API sets students[].unpaid on upcoming lessons; every lesson surface says so.
const FLAG = t.subscriptions.unpaidFlag;
const flagged = lesson({ students: [{ ...SUHAILA, unpaid: true }, JOUD] });
const clear = lesson({ students: [SUHAILA, JOUD] });

function card(l = flagged) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherLessonCard lesson={l} tz="Africa/Cairo" fallbackLink={null} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('«الباقة غير مدفوعة» on lessons (R-SUB-02)', () => {
  it('the week grid chip shows one flag when any student is flagged', () => {
    const { rerender } = render(<LessonChip lesson={flagged} onOpen={vi.fn()} />);
    expect(screen.getAllByText(FLAG)).toHaveLength(1);
    rerender(<LessonChip lesson={clear} onOpen={vi.fn()} />);
    expect(screen.queryByText(FLAG)).toBeNull();
  });

  it('the drawer flags the student, not the lesson', () => {
    render(<QueryClientProvider client={new QueryClient()}><LessonDetails lesson={flagged} /></QueryClientProvider>);
    const chip = screen.getByText(FLAG);
    expect(chip.closest('span.me-3')?.textContent).toContain(SUHAILA.name);
    expect(chip.closest('span.me-3')?.textContent).not.toContain(JOUD.name);
  });

  it('the teacher card names the flagged student when the lesson has several', () => {
    card();
    expect(screen.getByText(`${SUHAILA.name}: ${FLAG}`)).toBeTruthy();
  });

  it('a lesson with nobody flagged shows nothing', () => {
    card(clear);
    expect(screen.queryByText(new RegExp(FLAG))).toBeNull();
  });
});
