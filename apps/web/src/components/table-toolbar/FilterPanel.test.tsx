import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { liveSummary } from '@/test/open-filters';
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

  it('the footer says how many filters are set and how many rows they leave, politely announced', () => {
    render(<FilterPanel onClose={vi.fn()} count={2} resultCount={14}>{null}</FilterPanel>);
    const live = liveSummary();
    expect(live.textContent).toContain(t.table.activeCount.replace('{n}', '2'));
    expect(live.textContent).toContain('14');
    expect(live.className).not.toContain('sr-only');
  });

  it('is the full-screen sheet on phones: a pinned footer bar and the sheet\'s safe-area padding', () => {
    render(<FilterPanel onClose={vi.fn()}>{null}</FilterPanel>);
    const panel = screen.getByRole('dialog');
    expect(panel.querySelector('[data-dialog-header]')).not.toBeNull();
    const footer = panel.querySelector('[data-dialog-footer]');
    expect(footer?.className).toContain('max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]');
    expect(panel.className).toContain('max-sm:h-dvh');
  });
});
