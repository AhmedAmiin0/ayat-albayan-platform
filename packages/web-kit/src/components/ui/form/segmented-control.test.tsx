import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', lang: 'en' },
] as const;

const renderSeg = (pill?: boolean) => {
  const onChange = vi.fn();
  render(<SegmentedControl label="L" options={[...OPTIONS]} value="a" onChange={onChange} pill={pill} />);
  return onChange;
};

describe('SegmentedControl', () => {
  it('default look: the sunk track and raised pressed segment, unchanged', () => {
    const onChange = renderSeg();
    const group = screen.getByRole('group', { name: 'L' });
    expect(group.className).toBe(
      'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-rule bg-sunk p-[3px]',
    );
    const a = screen.getByRole('button', { name: 'A' });
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(a.className).toContain('bg-raised');
    expect(a.hasAttribute('lang')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('pill (opt-in): round track and a green pressed segment; lang on a segment', () => {
    renderSeg(true);
    expect(screen.getByRole('group').className).toContain('rounded-full');
    expect(screen.getByRole('button', { name: 'A' }).className).toContain('bg-lapis-fill');
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('lang')).toBe('en');
  });
});
