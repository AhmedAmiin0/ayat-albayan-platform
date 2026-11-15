import { describe, expect, it, vi } from 'vitest';
import { controlChips, pickSearch, splitControls, valueText } from './controls';
import type { ColumnFilterControl } from './types';

const ctl = (id: string, patch: Partial<ColumnFilterControl> = {}): ColumnFilterControl => ({
  id,
  key: id,
  label: id,
  filter: { kind: 'text' },
  value: '',
  onChange: vi.fn(),
  ...patch,
});
const select = (id: string, value = '') =>
  ctl(id, { value, filter: { kind: 'select', options: [{ value: 'active', label: 'مشترك' }] } });

describe('table toolbar controls', () => {
  it('the search is the marked text filter, else the first text one, never a select', () => {
    expect(pickSearch([select('s'), ctl('code'), ctl('name', { search: true })])?.id).toBe('name');
    expect(pickSearch([select('s'), ctl('code'), ctl('name')])?.id).toBe('code');
    expect(pickSearch([select('s')])).toBeUndefined();
  });

  it('a page with its own search box keeps every column filter in the panel', () => {
    const all = [ctl('code'), select('s')];
    expect(splitControls(all, true)).toEqual({ search: undefined, panel: all });
    expect(splitControls(all, false).panel.map((c) => c.id)).toEqual(['s']);
  });

  it('chip values: a select shows its option label, unknown values stay as they are', () => {
    expect(valueText(select('s', 'active'))).toBe('مشترك');
    expect(valueText(select('s', 'gone'))).toBe('gone');
    expect(valueText(ctl('name', { value: 'هدى' }))).toBe('هدى');
  });

  it('chips only for set filters; removing one clears it', () => {
    const name = ctl('name', { value: 'هدى' });
    const chips = controlChips([name, select('s')]);
    expect(chips.map((c) => [c.label, c.value])).toEqual([['name', 'هدى']]);
    chips[0]?.onRemove();
    expect(name.onChange).toHaveBeenCalledWith('');
  });
});
