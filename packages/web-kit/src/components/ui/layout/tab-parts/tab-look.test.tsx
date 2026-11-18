import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';

const TABS = [
  { value: 'a', label: 'a' },
  { value: 'b', label: 'b', badge: 2, ariaLabel: 'b, 2' },
];

describe('the family look of the tab strip (family: classes only)', () => {
  it('the horizontal strip and its tabs carry the pill look, scoped to data-skin=family', () => {
    render(<Tabs label="t" tabs={TABS} value="a" onChange={vi.fn()} />);
    const strip = screen.getByRole('tablist');
    expect(strip.className).toContain('family:rounded-full');
    expect(strip.className).toContain('border-b border-rule');
    const tab = screen.getByRole('tab', { name: 'a' });
    expect(tab.className).toContain('family:aria-selected:bg-lapis-fill');
    expect(tab.className).toContain('aria-selected:border-lapis');
    const badge = screen.getByRole('tab', { name: 'b, 2' }).querySelector('[aria-hidden="true"]');
    expect(badge?.className).toContain('family:in-aria-selected:bg-white');
  });

  it('every family class is behind the family: variant, so staff pages keep their look', () => {
    render(<Tabs label="t" tabs={TABS} value="a" onChange={vi.fn()} />);
    const added = screen.getByRole('tab', { name: 'a' }).className.split(' ')
      .filter((c) => c.includes('rounded-full') || c.includes('shadow-'));
    expect(added.every((c) => c.includes('family:'))).toBe(true);
  });

  it('the vertical fihris has no family look', () => {
    render(<Tabs label="t" tabs={TABS} value="a" onChange={vi.fn()} orientation="vertical" />);
    expect(screen.getByRole('tab', { name: 'a' }).className).not.toContain('family:');
  });
});
