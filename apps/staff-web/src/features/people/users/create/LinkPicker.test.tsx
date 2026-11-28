import type { LinkCandidate } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderWithClient } from '@/features/people/users/users-test-kit';
import { LinkPicker } from './LinkPicker';

const found = vi.hoisted(() => ({ rows: [] as LinkCandidate[] }));
vi.mock('@/features/people/users/api', () => ({
  candidatesQuery: (kind: string, q: string) =>
    queryOptions({ queryKey: ['candidates', kind, q], queryFn: async () => found.rows }),
}));

const candidate = (n: number): LinkCandidate => ({
  kind: 'student',
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name: `طالب ${n}`,
  code: null,
});

describe('LinkPicker results', () => {
  it('shows at most six matches, so the list never needs its own scroll', async () => {
    found.rows = [1, 2, 3, 4, 5, 6, 7, 8].map(candidate);
    renderWithClient(<LinkPicker kind="student" value={null} onChange={vi.fn()} />);
    expect(await screen.findByText('طالب 1')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByText('طالب 7')).toBeNull();
  });

  it('the list flows in the dialog body, which is the only scroller', async () => {
    found.rows = [candidate(1)];
    renderWithClient(<LinkPicker kind="student" value={null} onChange={vi.fn()} />);
    await screen.findByText('طالب 1');
    expect(screen.getByRole('list').className).not.toMatch(/overflow|max-h/);
  });

  it('no match shows the empty line and no list', async () => {
    found.rows = [];
    renderWithClient(<LinkPicker kind="student" value={null} onChange={vi.fn()} />);
    expect(await screen.findByText(t.users.link.empty)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
