import { gradeStyle, leadStatusStyle, studentStatusStyle } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { StatusChip, toneClass } from './status-chip';

describe('StatusChip', () => {
  it('shows the nuqta glyph AND the ar.json word, coloured by tone', () => {
    render(<StatusChip {...leadStatusStyle.new} label={t.enums.leadStatus.new} />);
    const chip = screen.getByText(t.enums.leadStatus.new).parentElement as HTMLElement;
    expect(chip.dataset['tone']).toBe('act');
    expect(chip.className).toContain('text-act');
    expect(chip.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe('hollow');
  });

  it('stopped states are struck; sm is 22px', () => {
    render(<StatusChip {...studentStatusStyle.churned} label={t.enums.studentStatus.churned} size="sm" />);
    const chip = screen.getByText(t.enums.studentStatus.churned).parentElement as HTMLElement;
    expect(chip.className).toContain('h-[22px]');
    expect(chip.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe('struck');
  });

  it('grades render ordinal pips, filled first', () => {
    render(<StatusChip {...gradeStyle.very_good} label={t.enums.grade.very_good} />);
    const chip = screen.getByText(t.enums.grade.very_good).parentElement as HTMLElement;
    const glyphs = [...chip.querySelectorAll('[data-glyph]')].map((g) => g.getAttribute('data-glyph'));
    expect(glyphs).toEqual(['fill', 'fill', 'fill', 'fill', 'hollow']);
  });

  it('bad uses the danger utilities (there is no text-bad)', () => {
    expect(toneClass.bad).toBe('bg-danger-soft text-danger border-danger/25');
  });
});
