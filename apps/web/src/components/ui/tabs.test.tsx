import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SegmentedControl } from './segmented-control';
import { Tabs } from './tabs';

const TABS = [
  { value: 'all', label: t.leads.filterAll, count: 107 },
  { value: 'new', label: t.enums.leadStatus.new, count: 11 },
  { value: 'lost', label: t.enums.leadStatus.lost },
] as const;

describe('Tabs', () => {
  it('marks the selected tab and reports clicks', () => {
    const onChange = vi.fn();
    render(<Tabs label={t.leads.status} tabs={[...TABS]} value="new" onChange={onChange} />);
    const tab = screen.getByRole('tab', { selected: true });
    expect(tab.textContent).toBe(`${t.enums.leadStatus.new}11`);
    fireEvent.click(screen.getByRole('tab', { name: t.enums.leadStatus.lost }));
    expect(onChange).toHaveBeenCalledWith('lost');
  });

  it('arrow keys follow RTL reading order and wrap', () => {
    const onChange = vi.fn();
    render(<Tabs label={t.leads.status} tabs={[...TABS]} value="all" orientation="vertical" onChange={onChange} />);
    const list = screen.getByRole('tablist');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(onChange.mock.calls).toEqual([['new'], ['lost']]);
  });
});

describe('SegmentedControl', () => {
  it('is a named group of pressed buttons', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label={t.theme.label}
        options={[
          { value: 'auto', label: t.theme.auto },
          { value: 'dark', label: t.theme.dark },
        ]}
        value="auto"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('group', { name: t.theme.label })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.theme.auto }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: t.theme.dark }));
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
