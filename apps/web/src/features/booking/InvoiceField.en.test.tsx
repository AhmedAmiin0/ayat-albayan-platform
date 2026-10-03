import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceField } from './InvoiceField';

// The invoice field and its errors in English (LTR): the same controls, en.json words.
vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

describe('InvoiceField, English', () => {
  it('labels, «From the chat» and the type error read in English', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InvoiceField value={null} requestId="req-1" chatPhone="+966501234567" onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Invoice').textContent).toContain('*');
    expect(screen.getByRole('button', { name: 'From the chat' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Upload the invoice'), { target: { files: [new File(['x'], 'a.mp3', { type: 'audio/mpeg' })] } });
    expect(screen.getByRole('alert').textContent).toBe('Upload a photo or PDF only');
  });
});
