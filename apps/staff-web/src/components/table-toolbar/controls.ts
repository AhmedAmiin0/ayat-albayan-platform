import type { ColumnFilterControl, FilterChip } from './types';

/** The control that becomes the search box: the one marked `search`, else the first text one. */
export function pickSearch(controls: ColumnFilterControl[]): ColumnFilterControl | undefined {
  const text = controls.filter((c) => c.filter.kind === 'text');
  return text.find((c) => c.search) ?? text[0];
}

/** A set value's display text: a select shows its option's label. */
export function valueText(c: ColumnFilterControl): string {
  if (c.filter.kind === 'text') return c.value;
  return c.filter.options.find((o) => o.value === c.value)?.label ?? c.value;
}

/** Chips for the set controls, in column order. */
export function controlChips(controls: ColumnFilterControl[]): FilterChip[] {
  return controls
    .filter((c) => c.value !== '')
    .map((c) => ({ id: `col:${c.id}`, label: c.label, value: valueText(c), onRemove: () => c.onChange('') }));
}

/** Splits the column controls: the toolbar's search (unless the page brings its own) and the panel's. */
export function splitControls(controls: ColumnFilterControl[], ownSearch: boolean) {
  const search = ownSearch ? undefined : pickSearch(controls);
  return { search, panel: controls.filter((c) => c !== search) };
}
