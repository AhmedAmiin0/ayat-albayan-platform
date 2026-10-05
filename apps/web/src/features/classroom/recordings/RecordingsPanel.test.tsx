import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { RecordingsPanel } from './RecordingsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('RecordingsPanel', () => {
  it('shows the error line when the list fails, and closes', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, null));
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RecordingsPanel source={{ kind: 'lesson', id: 'L1' }} onClose={onClose} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.classroom.recordings.error)).toBeTruthy();
    screen.getByRole('button', { name: t.common.close }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
