import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduledMeetingDialog } from './ScheduledMeetingDialog';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('ScheduledMeetingDialog, English', () => {
  it('reads in English: the title, the fields, the tabs and the zone note', () => {
    apiFetch.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ScheduledMeetingDialog onClose={() => undefined} tz="Africa/Cairo" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'Scheduled meeting' })).toBeTruthy();
    expect(screen.getByLabelText('Duration')).toBeTruthy();
    expect(screen.getByRole('option', { name: '60 min' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Team' })).toBeTruthy();
    expect(screen.getByText(/^Times in /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create meeting' })).toBeTruthy();
  });
});
