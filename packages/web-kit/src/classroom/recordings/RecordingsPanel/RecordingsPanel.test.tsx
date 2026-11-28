import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RecordingsPanel } from './RecordingsPanel';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('RecordingsPanel', () => {
  it('shows the error line when the list fails, and closes', async () => {
    mockApi.onRead(() => Promise.reject(new ApiError(500, null)));
    const onClose = vi.fn();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RecordingsPanel source={{ kind: 'lesson', id: 'L1' }} onClose={onClose} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.classroom.recordings.error)).toBeTruthy();
    screen.getByRole('button', { name: t.common.close }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
