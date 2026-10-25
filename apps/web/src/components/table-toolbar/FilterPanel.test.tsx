import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { FilterPanel } from './FilterPanel';

describe('FilterPanel', () => {
  it('a dialog named «تصفية» with the fields; «عرض النتائج» closes', () => {
    const onClose = vi.fn();
    render(<FilterPanel onClose={onClose}>{<p>حقول</p>}</FilterPanel>);
    const panel = screen.getByRole('dialog', { name: t.table.filter });
    expect(panel.textContent).toContain('حقول');
    expect(screen.queryByRole('button', { name: t.table.clearAll })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.table.showResults }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('«مسح الكل» in the footer only when given', () => {
    const onClearAll = vi.fn();
    render(<FilterPanel onClose={vi.fn()} onClearAll={onClearAll}>{null}</FilterPanel>);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it('the primary button carries the result count when the page knows it: «عرض النتائج (14)»', () => {
    const onClose = vi.fn();
    render(<FilterPanel onClose={onClose} count={2} resultCount={14}>{null}</FilterPanel>);
    expect(screen.queryByRole('button', { name: t.table.showResults })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '14') }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('the footer says how many filters are set and how many rows they leave (visible, not a second live region)', () => {
    render(<FilterPanel onClose={vi.fn()} count={2} resultCount={14}>{null}</FilterPanel>);
    const note = screen.getByText(new RegExp(t.table.activeCount.replace('{n}', '2')));
    expect(note.textContent).toContain('14');
    expect(note.className).not.toContain('sr-only');
    expect(note.getAttribute('aria-live')).toBeNull();
    expect(document.querySelector('[data-filter-summary]')).toBeNull();
  });

  it('no filter set: the footer note is absent, so an empty hint collapses on phones', () => {
    render(<FilterPanel onClose={vi.fn()} count={0} resultCount={14}>{null}</FilterPanel>);
    const footer = screen.getByRole('dialog').querySelector('[data-dialog-footer]');
    expect(footer?.firstElementChild?.childElementCount).toBe(0);
    expect(footer?.firstElementChild?.className).toContain('max-sm:empty:hidden');
  });

  it('is the full-screen sheet on phones: a pinned footer bar and the sheet\'s safe-area padding', () => {
    render(<FilterPanel onClose={vi.fn()}>{null}</FilterPanel>);
    const panel = screen.getByRole('dialog');
    expect(panel.querySelector('[data-dialog-header]')).not.toBeNull();
    const footer = panel.querySelector('[data-dialog-footer]');
    expect(footer?.className).toContain('max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]');
    expect(panel.className).toContain('max-sm:h-dvh');
  });

  it('«مسح الكل» moves focus to the primary button before it goes away, so the dialog keeps focus', () => {
    const onClearAll = vi.fn();
    render(<FilterPanel onClose={vi.fn()} onClearAll={onClearAll}>{null}</FilterPanel>);
    const clear = screen.getByRole('button', { name: t.table.clearAll });
    clear.focus();
    fireEvent.click(clear);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: t.table.showResults }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });
});
