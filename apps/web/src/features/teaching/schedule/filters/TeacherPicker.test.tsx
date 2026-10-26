import { counted } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { T_ABRAR, T_FATMA, T_NOUR } from '../overview-fixture';
import { pickedLabel, TeacherPicker } from './TeacherPicker';

const ALL = [T_ABRAR, T_FATMA, T_NOUR];

describe('TeacherPicker (teacher multi-select)', () => {
  it('sums up everyone, one name, or a count', () => {
    expect(pickedLabel(ALL, [])).toBe(t.schedule.allTeachers);
    expect(pickedLabel(ALL, ['t-nour'])).toBe('نور');
    expect(pickedLabel(ALL, ['t-abrar', 't-nour'])).toBe(counted(t.schedule.teachersPicked, 2));
  });

  it('ticks add a teacher, unticking removes them', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TeacherPicker teachers={ALL} value={[]} onChange={onChange} />);
    expect(screen.getByText(t.schedule.allTeachers)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'نور' }));
    expect(onChange).toHaveBeenLastCalledWith(['t-nour']);
    rerender(<TeacherPicker teachers={ALL} value={['t-nour', 't-abrar']} onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'أبرار' })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'نور' }));
    expect(onChange).toHaveBeenLastCalledWith(['t-abrar']);
  });

  it('the summary keeps the control floor (44px on phones, 40px from 640px): no fixed height overrides it', () => {
    render(<TeacherPicker teachers={ALL} value={[]} onChange={vi.fn()} />);
    const summary = screen.getByText(t.schedule.allTeachers).closest('summary');
    expect(summary?.className).toContain('min-h-11');
    expect(summary?.className).not.toMatch(/(?:^|\s)h-\d/);
  });
});
