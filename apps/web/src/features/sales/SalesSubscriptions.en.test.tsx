import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SubscriptionKind } from './api';
import { SalesSubscriptions } from './SalesSubscriptions';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

/** The route's `kind` as local state, so the tabs swap the list as they do on /sales/subscriptions. */
function Harness() {
  const [kind, setKind] = useState<SubscriptionKind>('pending');
  return <SalesSubscriptions kind={kind} onKind={setKind} />;
}

describe('SalesSubscriptions, English', () => {
  it('two separate tabs, a row and an empty confirmed list read in English', async () => {
    const row = { id: 'p1', student: { id: 's1', code: 'AB-0183', name: 'Suhaila' }, package: '8 lessons', status: 'unpaid', starts_on: null, lessons_total: 8 };
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('confirmed') ? [] : [row]));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Harness />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Suhaila')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Pending' })).toBeTruthy();
    expect(screen.getAllByText(/8 lessons/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Confirmed' }));
    expect(await screen.findByText('No confirmed subscriptions')).toBeTruthy();
  });
});
