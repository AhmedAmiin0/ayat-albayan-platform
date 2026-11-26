import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { configWrapper } from '@ab/web-kit/testing';
import { lesson, SUHAILA } from './lesson-fixture';
import { LessonChip } from './LessonChip';

// A week cell is narrow: the student's name and the status read in full (docs/65 UX-6).
const LONG = 'Abdulrahman Abdulaziz Al-Example';

describe('LessonChip in a narrow week cell', () => {
  it('wraps the student name instead of cutting it', () => {
    const l = lesson({ students: [{ ...SUHAILA, name: LONG }] });
    render(<LessonChip lesson={l} onOpen={vi.fn()} />, { wrapper: configWrapper() });
    const name = screen.getByText(LONG, { exact: false });
    expect(name.className).not.toContain('truncate');
    expect(name.className).toMatch(/(^| )wrap-anywhere( |$)/);
    expect(name.parentElement?.className).toContain('flex-wrap');
  });

  it('wraps the status label instead of cutting it', () => {
    const { container } = render(<LessonChip lesson={lesson({ status: 'no_show' })} onOpen={vi.fn()} />, {
      wrapper: configWrapper(),
    });
    expect(container.querySelector('.truncate')).toBeNull();
  });
});
