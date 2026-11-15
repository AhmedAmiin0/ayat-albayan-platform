import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CLEAR_THREAD_FILTERS, threadFilterChips } from './thread-filters';

const search = { page: 1, sort: 'unread', f_status: 'new' } as const;

describe('threadFilterChips', () => {
  it('no chip while nothing is set (the unread tabs and the search box are their own controls)', () => {
    expect(threadFilterChips({ search: { page: 1, unread: true, q: 'منى' }, mode: 'admin', onFilter: vi.fn() })).toEqual([]);
  });

  it('admin: the order and the lead status, each removing only itself', () => {
    const onFilter = vi.fn();
    const chips = threadFilterChips({ search, mode: 'admin', onFilter });
    expect(chips.map((c) => [c.id, c.label, c.value])).toEqual([
      ['sort', t.inbox.sort.label, t.inbox.sort.unread],
      ['f_status', t.inbox.statusFilter, t.enums.leadStatus.new],
    ]);
    chips.forEach((c) => c.onRemove());
    expect(onFilter.mock.calls).toEqual([[{ sort: undefined }], [{ f_status: undefined }]]);
  });

  it('teacher mode has no lead-status chip', () => {
    const chips = threadFilterChips({ search, mode: 'teacher', onFilter: vi.fn() });
    expect(chips.map((c) => c.id)).toEqual(['sort']);
  });

  it('«مسح الكل» clears the order and the status only (the unread tab and the search stay)', () => {
    expect(CLEAR_THREAD_FILTERS).toEqual({ sort: undefined, f_status: undefined });
    expect(Object.keys(CLEAR_THREAD_FILTERS)).toEqual(['sort', 'f_status']);
  });
});
