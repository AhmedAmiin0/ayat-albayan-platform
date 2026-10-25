import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SegmentedControl } from '../form/segmented-control';
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

  it('in an LTR (English) page the RIGHT arrow is next', () => {
    const onChange = vi.fn();
    render(
      <div dir="ltr">
        <Tabs label={t.leads.status} tabs={[...TABS]} value="all" onChange={onChange} />
      </div>,
    );
    const list = screen.getByRole('tablist');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(onChange.mock.calls).toEqual([['new'], ['lost']]);
  });

  it('vertical: a dotted leader only before a count; separators group tabs without breaking arrows', () => {
    const onChange = vi.fn();
    const tabs = [...TABS, { value: 'no_reply', label: t.enums.leadStatus.no_reply, separatorBefore: true }];
    render(<Tabs label={t.leads.status} tabs={tabs} value="lost" orientation="vertical" onChange={onChange} />);
    const leaders = (name: string) =>
      screen.getByRole('tab', { name: new RegExp(name) }).querySelectorAll('.border-dotted').length;
    expect(leaders(t.leads.filterAll)).toBe(1);
    expect(leaders(t.enums.leadStatus.lost)).toBe(0);
    const list = screen.getByRole('tablist');
    expect(list.querySelectorAll('hr[aria-hidden="true"]')).toHaveLength(1);
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('no_reply');
  });
});

describe('Tabs orientation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the vertical fihris announces horizontal while it is a chip row (< 900px)', () => {
    const query = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn(() => query));
    render(<Tabs label={t.leads.status} tabs={[...TABS]} value="all" orientation="vertical" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('horizontal');
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 56.25rem)');
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
