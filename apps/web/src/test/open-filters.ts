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

/** Clicks the first «مسح الكل» (the chip row's; the panel has its own while open). */
export function clearAllFilters(): void {
  const [first] = screen.getAllByRole('button', { name: t.table.clearAll });
  if (first) fireEvent.click(first);
}
