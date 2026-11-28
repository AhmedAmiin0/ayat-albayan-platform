import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceField } from '@/features/teaching/booking/invoice/InvoiceField/InvoiceField';
import { mockCall } from '@ab/testing/mock-call';

// The invoice field and its errors in English (LTR): the same controls, en.json words.
vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({
  ...(await orig<object>()),
  locale: 'en',
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('InvoiceField, English', () => {
  it('labels, «From the chat» and the type error read in English', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InvoiceField value={null} requestId="req-1" chatPhone="+966501234567" onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Invoice').textContent).toContain('*');
    expect(screen.getByRole('button', { name: 'From chat' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Upload invoice'), {
      target: { files: [new File(['x'], 'a.mp3', { type: 'audio/mpeg' })] },
    });
    expect(screen.getByRole('alert').textContent).toBe('Upload an image or PDF only');
  });
});
