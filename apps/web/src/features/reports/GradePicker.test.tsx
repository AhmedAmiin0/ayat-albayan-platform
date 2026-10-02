import { GRADES } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { GradePicker } from './GradePicker';

describe('GradePicker (R-REP-02)', () => {
  it('every tile spells its grade, so a teacher never counts dots; the radios keep their names', () => {
    const onChange = vi.fn();
    const { container } = render(<GradePicker name="g" label="التجويد" value={null} onChange={onChange} />);
    const words = [...container.querySelectorAll('label > span')].map((s) => s.textContent);
    expect(words).toEqual(GRADES.map((g) => t.enums.grade[g]));
    expect(screen.getByText(t.reports.chart.noGrade)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: t.enums.grade.very_good }));
    expect(onChange).toHaveBeenCalledWith('very_good');
  });
});
