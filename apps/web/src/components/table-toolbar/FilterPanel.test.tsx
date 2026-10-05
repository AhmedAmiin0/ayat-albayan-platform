import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
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
});
