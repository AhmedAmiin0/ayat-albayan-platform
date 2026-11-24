import type { NumberView, ParityView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { vi, type Mock } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { NUMBERS, PARITY_SAME } from './numbers.fixture';
import { NumbersPanel } from './NumbersPanel';

export interface PanelRoutes {
  numbers?: NumberView[];
  parity?: ParityView;
}

export function renderPanel(apiFetch: Mock, routes: PanelRoutes = {}): { client: QueryClient; onSaved: Mock } {
  routeFetch(apiFetch, [
    ['/admin/numbers', routes.numbers ?? NUMBERS],
    ['/admin/communications/parity', routes.parity ?? PARITY_SAME],
  ]);
  const onSaved: Mock = vi.fn();
  const client = renderWithClient(<NumbersPanel query="" onSaved={onSaved} />);
  return { client, onSaved };
}

/** How many times a path was fetched (a refetch after a write counts). */
export const fetchCount = (apiFetch: Mock, path: string): number => apiFetch.mock.calls.filter(([p]) => p === path).length;
