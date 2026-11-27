import { CODE_STATUS_KEY } from '@ab/client-core';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CodesGate } from './CodesGate';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch, apiSend: vi.fn() }));

const gate = (status: object | undefined, side?: 'family' | 'staff') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (status) client.setQueryData(CODE_STATUS_KEY, status);
  return render(
    <QueryClientProvider client={client}>
      <CodesGate {...(side && { side })} fallback={<p>closed</p>}>
        <p>open</p>
      </CodesGate>
    </QueryClientProvider>,
  );
};

describe('CodesGate (docs/30 §4)', () => {
  it('waits while the status loads', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    gate(undefined);
    expect(screen.getByText(t.common.loading)).toBeTruthy();
  });

  it('family side: children when available, the fallback when not', () => {
    const { unmount } = gate({ available: true, staff: false });
    expect(screen.getByText('open')).toBeTruthy();
    unmount();
    gate({ available: false, staff: true });
    expect(screen.getByText('closed')).toBeTruthy();
  });

  it('staff side reads the staff flag', () => {
    gate({ available: false, staff: true }, 'staff');
    expect(screen.getByText('open')).toBeTruthy();
  });

  it('a failed status call counts as not available', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    gate(undefined);
    expect(await screen.findByText('closed')).toBeTruthy();
  });
});
