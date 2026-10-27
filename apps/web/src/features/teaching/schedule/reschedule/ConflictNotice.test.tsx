import type { Conflict } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ConflictNotice, conflictText } from './ConflictNotice';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const busy = (startsAt: string): Conflict => ({ kind: 'teacher_busy', startsAt, endsAt: startsAt });

describe('ConflictNotice (R-SCH-04, issue B3)', () => {
  it('words each conflict kind in Arabic with the Riyadh time', () => {
    const text = conflictText({ kind: 'student_busy', startsAt: '2026-10-04T14:00:00Z', endsAt: '2026-10-04T14:45:00Z' }, C24);
    expect(text.startsWith(t.booking.conflict.student_busy.split('(')[0] ?? '')).toBe(true);
    expect(text).toContain('17:00');
    expect(text).not.toContain('{when}');
  });

  it("adds the teacher's own clock to availability / time-off lines, e.g. after a DST change", () => {
    const outside: Conflict = { kind: 'outside_availability', startsAt: '2026-11-01T14:00:00Z', endsAt: '2026-11-01T14:45:00Z' };
    const text = conflictText(outside, C24, 'Africa/Cairo');
    expect(text).toContain('17:00');
    expect(text).toContain(t.booking.teacherClock.replace('{time}', '16:00').split(' بتوقيت')[0] ?? '');
    expect(conflictText(busy('2026-11-01T14:00:00Z'), C24, 'Africa/Cairo')).not.toContain('16:00');
    expect(conflictText(outside, C24, 'Asia/Riyadh')).not.toContain('،');
  });

  it('keeps the heading a heading inside the live region; the reason hint fits booking', () => {
    render(<ConflictNotice conflicts={[busy('2026-10-04T14:00:00Z')]} onChangeSlot={vi.fn()} onOverride={vi.fn()} />);
    expect(screen.getByRole('heading', { name: t.booking.conflictTitle })).toBeTruthy();
    expect(screen.getByPlaceholderText(t.booking.overridePlaceholder)).toBeTruthy();
  });

  it('lists five clashes and counts the rest', () => {
    const many = Array.from({ length: 7 }, (_, i) => busy(`2026-10-${10 + i}T14:00:00Z`));
    render(<ConflictNotice conflicts={many} onChangeSlot={vi.fn()} onOverride={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toBe(t.booking.conflictTitle);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(t.booking.conflictMore.replace('{n}', '2'))).toBeTruthy();
  });

  it('book-anyway needs a reason, then passes it on', () => {
    const onOverride = vi.fn();
    render(<ConflictNotice conflicts={[busy('2026-10-04T14:00:00Z')]} onChangeSlot={vi.fn()} onOverride={onOverride} />);
    fireEvent.click(screen.getByRole('button', { name: t.booking.override }));
    expect(onOverride).not.toHaveBeenCalled();
    expect(screen.getByText(t.common.required)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.booking.overrideReason), { target: { value: '  طلب ولي الأمر ' } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.override }));
    expect(onOverride).toHaveBeenCalledWith('طلب ولي الأمر');
  });

  it('«اختر موعدًا آخر» goes back to the slots', () => {
    const onChangeSlot = vi.fn();
    render(<ConflictNotice conflicts={[busy('2026-10-04T14:00:00Z')]} onChangeSlot={onChangeSlot} onOverride={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.booking.changeSlot }));
    expect(onChangeSlot).toHaveBeenCalled();
  });

  it('without onOverride (the assistant) only «اختر موعدًا آخر» is offered: no reason, no book-anyway', () => {
    render(<ConflictNotice conflicts={[busy('2026-10-04T14:00:00Z')]} onChangeSlot={vi.fn()} />);
    expect(screen.getByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.override })).toBeNull();
    expect(screen.queryByPlaceholderText(t.booking.overridePlaceholder)).toBeNull();
  });
});
