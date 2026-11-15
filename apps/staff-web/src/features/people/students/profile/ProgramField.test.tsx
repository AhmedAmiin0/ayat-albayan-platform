import { PROGRAMS } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ProgramField } from './ProgramField';

describe('ProgramField', () => {
  it('every program by its Arabic name; picking one reports it', () => {
    const onChange = vi.fn();
    render(<ProgramField value="quran" onChange={onChange} />);
    const select = screen.getByLabelText<HTMLSelectElement>(t.students.program);
    expect(select.value).toBe('quran');
    expect(screen.getAllByRole('option')).toHaveLength(PROGRAMS.length);
    const other = PROGRAMS.find((p) => p !== 'quran') ?? 'quran';
    fireEvent.change(select, { target: { value: other } });
    expect(onChange).toHaveBeenCalledWith(other);
  });
});
