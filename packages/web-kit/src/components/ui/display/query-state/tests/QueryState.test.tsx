import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryState } from '#/components/ui/display/query-state/index.ts';
import { t } from '#/lib/i18n/i18n.ts';

const query = (data: readonly string[] | undefined, isError = false) => ({
  data,
  isError,
  refetch: vi.fn(() => Promise.resolve()),
});

const list = (items: readonly string[]) => <p>{items.join(',')}</p>;
const none = (items: readonly string[]): boolean => items.length === 0;

describe('QueryState', () => {
  it('shows a busy skeleton while loading', () => {
    render(<QueryState query={query(undefined)}>{list}</QueryState>);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });

  it('shows a quiet skeleton without a status role', () => {
    const { container } = render(
      <QueryState query={query(undefined)} quiet>
        {list}
      </QueryState>,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[aria-busy=true]')).toBeTruthy();
  });

  it('shows a caller skeleton in place of the default one', () => {
    render(
      <QueryState query={query(undefined)} loading={<p>wait</p>}>
        {list}
      </QueryState>,
    );
    expect(screen.getByText('wait')).toBeTruthy();
  });

  it('shows the error line whose retry calls refetch', () => {
    const q = query(undefined, true);
    render(<QueryState query={q}>{list}</QueryState>);
    expect(screen.getByRole('alert').textContent).toContain(t.common.loadFailed);
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(q.refetch).toHaveBeenCalledOnce();
  });

  it('shows a caller error in place of the default line', () => {
    render(
      <QueryState query={query(undefined, true)} error={<p>own</p>}>
        {list}
      </QueryState>,
    );
    expect(screen.getByText('own')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the empty state when the data is empty', () => {
    render(
      <QueryState query={query([])} isEmpty={none} empty={<p>nothing</p>}>
        {list}
      </QueryState>,
    );
    expect(screen.getByText('nothing')).toBeTruthy();
  });

  it('renders the data', () => {
    render(
      <QueryState query={query(['a', 'b'])} isEmpty={none} empty={<p>nothing</p>}>
        {list}
      </QueryState>,
    );
    expect(screen.getByText('a,b')).toBeTruthy();
  });
});
