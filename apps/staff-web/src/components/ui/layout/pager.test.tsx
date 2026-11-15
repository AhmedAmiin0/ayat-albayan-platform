import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { pageList } from './page-list';
import { Pager } from './pager';

describe('pageList', () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 8, [1, 2, 3, 'gap', 8]],
    [5, 8, [1, 'gap', 4, 5, 6, 7, 8]],
    [4, 9, [1, 2, 3, 4, 5, 'gap', 9]],
    [8, 8, [1, 'gap', 6, 7, 8]],
  ] as const)('page %i of %i', (page, pages, out) => {
    expect(pageList(page, pages)).toEqual(out);
  });
});

describe('Pager', () => {
  it('shows the count, the current page in the rosette, and steps', () => {
    const onPage = vi.fn();
    render(<Pager page={1} total={64} pageSize={8} onPage={onPage} />);
    expect(screen.getByText('عرض 8 من 64')).toBeTruthy();
    const current = screen.getByRole('button', { name: '1' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: t.common.prevPage })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: t.common.nextPage }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(onPage.mock.calls).toEqual([[2], [8]]);
  });

  it('counts the short last page', () => {
    render(<Pager page={3} total={45} pageSize={20} onPage={() => undefined} />);
    expect(screen.getByText('عرض 5 من 45')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.common.nextPage })).toHaveProperty('disabled', true);
  });

  it('one page: count only; empty list: nothing', () => {
    const { container, rerender } = render(<Pager page={1} total={3} pageSize={25} onPage={() => undefined} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Pager page={1} total={0} pageSize={25} onPage={() => undefined} />);
    expect(container.textContent).toBe('');
  });
});
