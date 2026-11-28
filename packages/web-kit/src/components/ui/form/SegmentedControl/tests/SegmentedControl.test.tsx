import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/SegmentedControl';
import type { SegmentOption } from '@ab/web-kit/components/ui/form/SegmentedControl';

type V = 'a' | 'b' | 'c';
const OPTIONS: SegmentOption<V>[] = [
  { value: 'a', label: 'Alpha', icon: 'sun' },
  { value: 'b', label: 'Beta two', short: 'B2' },
  { value: 'c', label: 'Gamma', count: 3 },
];

const seg = (size?: 'compact') =>
  render(
    <SegmentedControl label="Group" options={OPTIONS} value="b" onChange={vi.fn()} size={size} />,
  );

describe('SegmentedControl', () => {
  it('regular: every segment shows its label and no icon, whatever the option carries', () => {
    seg();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Alpha',
      'Beta two',
      'Gamma3',
    ]);
    expect(screen.getByRole('button', { name: 'Alpha' }).querySelector('svg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('aria-label')).toBeNull();
  });

  it('compact: the icon or short text shows and the label names the segment', () => {
    seg('compact');
    const alpha = screen.getByRole('button', { name: 'Alpha' });
    expect(alpha.textContent).toBe('');
    expect(alpha.querySelector('svg')).not.toBeNull();
    expect(alpha.getAttribute('title')).toBe('Alpha');
    expect(screen.getByRole('button', { name: 'Beta two' }).textContent).toBe('B2');
    expect(screen.getByRole('button', { name: 'Gamma3' }).getAttribute('aria-label')).toBeNull();
  });

  it('compact: 44 px segments on touch, none of the regular 30 px floor', () => {
    seg('compact');
    for (const b of screen.getAllByRole('button')) {
      const cls = b.className.split(' ');
      expect(cls).toEqual(
        expect.arrayContaining(['min-h-11', 'min-w-11', 'pointer-coarse:min-h-11']),
      );
      expect(cls).not.toContain('sm:min-h-[30px]');
    }
  });

  it('reports the picked value and marks the pressed one', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Group"
        options={OPTIONS}
        value="b"
        onChange={onChange}
        size="compact"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChange).toHaveBeenCalledWith('a');
    expect(screen.getByRole('button', { name: 'Beta two' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
