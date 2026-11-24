import { fireEvent, screen, within } from '@testing-library/react';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const filterButton = () => ({ name: new RegExp(`^${t.table.filter}`) });

/** The filter button's name ends with the active count when set; `scope` picks the table. */
export function openFilters(scope?: HTMLElement): HTMLElement {
  const root = scope ? within(scope) : screen;
  fireEvent.click(root.getByRole('button', filterButton()));
  return screen.getByRole('dialog', { name: t.table.filter });
}

/** openFilters once the toolbar has rendered (after the list loads). */
export async function findFilters(): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole('button', filterButton()));
  return screen.getByRole('dialog', { name: t.table.filter });
}

/** Its name carries the result count when the page knows it. */
export function closeFilters(): void {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${t.table.showResults}`) }));
}

/**
 * The polite live region that announces the applied filters (the toolbar's, else the open panel's).
 * Not role=status: a page's toast already is, and tests find that one by role.
 */
export function liveSummary(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-filter-summary]');
  if (!el) throw new Error('no filter summary on the page');
  return el;
}

/** Clicks the chip row's clear-all; the panel has its own while open. */
export function clearAllFilters(): void {
  const [first] = screen.getAllByRole('button', { name: t.table.clearAll });
  if (first) fireEvent.click(first);
}
