import { fireEvent, screen, within } from '@testing-library/react';
import { t } from '@/lib/i18n';

const filterButton = () => ({ name: new RegExp(`^${t.table.filter}`) });

/**
 * Unit tests: clicks the table toolbar's «تصفية» (its name ends with the active count when any
 * is set) and returns the panel; `scope` picks the table when the page has several.
 */
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

/** Closes the panel with «عرض النتائج»; its name carries the count when the page knows it («عرض النتائج (14)»). */
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

/** Clicks the first «مسح الكل» (the chip row's; the panel has its own while open). */
export function clearAllFilters(): void {
  const [first] = screen.getAllByRole('button', { name: t.table.clearAll });
  if (first) fireEvent.click(first);
}
