import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StackedBar, type ShareSegment } from '@ab/web-kit/components/ui/charts/StackedBar';

const SEGMENTS: ShareSegment[] = [
  { key: 'held', label: 'تمت', value: 6, glyph: 'fill' },
  { key: 'planned', label: 'مجدولة', value: 2, glyph: 'hollow' },
  { key: 'missed', label: 'غياب', value: 2, glyph: 'struck', flag: 'bad' },
];

const fillOf = (c: HTMLElement, key: string) =>
  c.querySelector<HTMLElement>(`[data-fill="${key}"]`);

describe('StackedBar', () => {
  it('is a named group whose bar is hidden and whose legend prints value and percent', () => {
    const { container } = render(<StackedBar label="الحلقات حسب الحالة" segments={SEGMENTS} />);
    const group = screen.getByRole('group', { name: 'الحلقات حسب الحالة' });
    expect(group.querySelector('[aria-hidden="true"]')).toBe(
      fillOf(container, 'held')?.parentElement,
    );
    const held = container.querySelector('[data-segment="held"]') as HTMLElement;
    expect(within(held).getByText('تمت')).toBeTruthy();
    expect(within(held).getByText('6')).toBeTruthy();
    expect(within(held).getByText('60%')).toBeTruthy();
  });

  it('sizes each segment by its share of the total in the logical inline size', () => {
    const { container } = render(<StackedBar label="x" segments={SEGMENTS} />);
    expect(fillOf(container, 'held')?.style.inlineSize).toBe('60%');
    expect(fillOf(container, 'missed')?.style.inlineSize).toBe('20%');
  });

  it('keeps unflagged segments in neutral inks and only flagged ones in danger or saffron', () => {
    const flagged = [
      ...SEGMENTS,
      { key: 'late', label: 'متأخر', value: 1, glyph: 'half' as const, flag: 'act' as const },
    ];
    const { container } = render(<StackedBar label="x" segments={flagged} />);
    expect(fillOf(container, 'held')?.className).toMatch(/bg-ink-3/);
    expect(fillOf(container, 'planned')?.className).toMatch(/bg-ink-2/);
    expect(fillOf(container, 'missed')?.className).toMatch(/bg-danger/);
    expect(fillOf(container, 'late')?.className).toMatch(/bg-act/);
  });

  it('marks each legend entry with its status glyph, not colour alone', () => {
    const { container } = render(<StackedBar label="x" segments={SEGMENTS} />);
    const glyphs = [...container.querySelectorAll('[data-glyph]')].map((g) =>
      g.getAttribute('data-glyph'),
    );
    expect(glyphs).toEqual(['fill', 'hollow', 'struck']);
  });

  it('makes a legend entry a button only when its segment can be selected', () => {
    const onSelect = vi.fn();
    render(
      <StackedBar
        label="x"
        segments={[
          { ...SEGMENTS[1], key: 'p', label: 'مجدولة', value: 1, glyph: 'hollow', onSelect },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'مجدولة' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows the empty line instead of a bar when every value is zero or negative', () => {
    render(
      <StackedBar
        label="x"
        empty="لا بيانات"
        segments={[
          { key: 'a', label: 'أ', value: 0, glyph: 'fill' },
          { key: 'b', label: 'ب', value: -3, glyph: 'fill' },
        ]}
      />,
    );
    expect(screen.getByText('لا بيانات')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('counts a negative value as zero when others are positive', () => {
    const { container } = render(
      <StackedBar
        label="x"
        segments={[
          { key: 'a', label: 'أ', value: 4, glyph: 'fill' },
          { key: 'b', label: 'ب', value: -4, glyph: 'fill' },
        ]}
      />,
    );
    expect(fillOf(container, 'a')?.style.inlineSize).toBe('100%');
    expect(fillOf(container, 'b')?.style.inlineSize).toBe('0%');
  });
});
