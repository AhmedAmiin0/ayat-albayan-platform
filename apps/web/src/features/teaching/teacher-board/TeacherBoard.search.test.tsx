import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILTER_DEBOUNCE_MS } from '@/components/data-table/ColumnFilterText';
import { t } from '@/lib/i18n/i18n';
import { FACTS, renderBoard } from './board-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));

const names = () => screen.queryAllByRole('link').map((a) => a.textContent);

async function search(q: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: t.teacherBoard.searchLabel }), {
    target: { value: q },
  });
  await act(() => vi.advanceTimersByTimeAsync(FILTER_DEBOUNCE_MS));
}

describe('TeacherBoard search (docs/48)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetch.mockReset().mockImplementation(FACTS);
  });
  afterEach(() => vi.useRealTimers());

  it('narrows by name, by code in any case, and by the facts line', async () => {
    renderBoard();
    await screen.findByText(/جزء عمّ/);
    await search('هند');
    expect(names()).toEqual(['هند']);
    await search('ab-s-2');
    expect(names()).toEqual(['جود']);
    await search('جزء');
    expect(names()).toEqual(['سهيلة']);
  });

  it('a miss says so; «امسح البحث» empties the box and brings every row back', async () => {
    renderBoard();
    await search('زينب');
    expect(screen.getByText(t.teacherBoard.noMatch)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.teacherBoard.clearSearch }));
    expect(names()).toHaveLength(4);
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');
  });
});
