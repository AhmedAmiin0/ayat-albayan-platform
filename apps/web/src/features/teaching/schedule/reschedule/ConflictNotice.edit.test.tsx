import type { Conflict } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ConflictNotice } from './ConflictNotice';

const clash: Conflict = { kind: 'student_busy', startsAt: '2026-10-04T14:00:00Z', endsAt: '2026-10-04T14:45:00Z', studentId: 's-1' };
const labels = { override: t.lessons.timeEdit.overrideEdit, reason: t.lessons.timeEdit.overrideReasonEdit };

describe('ConflictNotice inside an edit (R-SCH-11)', () => {
  it('speaks the edit, names the busy student, starts with the form reason and stacks its controls', () => {
    const onOverride = vi.fn();
    const { container } = render(
      <ConflictNotice conflicts={[clash]} labels={labels} initialReason="طلب ولي الأمر" studentNames={{ 's-1': 'سهيلة' }} onChangeSlot={vi.fn()} onOverride={onOverride} />,
    );
    expect(screen.getByText(/^سهيلة: /)).toBeTruthy();
    expect((screen.getByLabelText(labels.reason) as HTMLInputElement).value).toBe('طلب ولي الأمر');
    expect(screen.queryByText(t.booking.override)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: labels.override }));
    expect(onOverride).toHaveBeenCalledWith('طلب ولي الأمر');
    // A viewport breakpoint would squeeze the field inside a 460px drawer: the grid never goes two-column.
    expect(container.innerHTML).not.toMatch(/sm:grid-cols/);
  });

  it('«اختر موعدًا آخر» is the strong button, the override an outlined secondary in the same ButtonRow', () => {
    render(<ConflictNotice conflicts={[clash]} labels={labels} onChangeSlot={vi.fn()} onOverride={vi.fn()} />);
    const strong = screen.getByRole('button', { name: t.booking.changeSlot });
    const quiet = screen.getByRole('button', { name: labels.override });
    expect(strong.className).toContain('bg-primary');
    expect(quiet.className).toContain('border-input');
    expect(quiet.className).not.toContain('text-lapis');
    expect(strong.parentElement).toBe(quiet.parentElement);
    expect(strong.parentElement?.firstElementChild).toBe(strong);
  });
});
