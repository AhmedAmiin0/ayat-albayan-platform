import { GRADES } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { GradePicker } from './GradePicker';

describe('GradePicker (R-REP-02)', () => {
  it('every tile spells its grade, so a teacher never counts dots; the radios keep their names', () => {
    const onChange = vi.fn();
    const { container } = render(<GradePicker name="g" label="التجويد" value={null} onChange={onChange} />);
    const words = [...container.querySelectorAll('label > span')].map((s) => s.textContent);
    expect(words).toEqual(GRADES.map((g) => t.enums.grade[g]));
    expect(screen.queryByText(t.reports.chart.noGrade)).toBeNull(); // said only after a send attempt
    fireEvent.click(screen.getByRole('radio', { name: t.enums.grade.very_good }));
    expect(onChange).toHaveBeenCalledWith('very_good');
  });
});

describe('GradePicker required / invalid (the failed-submit state)', () => {
  it('a required row carries an aria-hidden « *»; an invalid one is marked and red-edged', () => {
    const { container } = render(<GradePicker name="g" label="التجويد" value={null} onChange={vi.fn()} required invalid />);
    const group = container.querySelector('fieldset');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(group?.className).toContain('border-s-danger');
    expect(container.querySelector('legend [aria-hidden="true"]')?.textContent).toBe(' *');
    expect(screen.getByRole('group', { name: 'التجويد' })).toBeTruthy(); // the mark is not in the name
    expect(screen.getByText(t.reports.chart.noGrade)).toBeTruthy();
  });

  it('not required, not invalid: plain', () => {
    const { container } = render(<GradePicker name="g" label="التجويد" value={null} onChange={vi.fn()} />);
    expect(container.querySelector('fieldset')?.getAttribute('aria-invalid')).toBeNull();
    expect(container.querySelector('legend [aria-hidden]')).toBeNull();
  });
});
