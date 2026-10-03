import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalesMeetings } from './SalesMeetings';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('SalesMeetings, English', () => {
  it('an empty day reads in English', async () => {
    apiFetch.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SalesMeetings />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('No meetings on this day')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Meetings schedule' })).toBeTruthy();
  });
});
