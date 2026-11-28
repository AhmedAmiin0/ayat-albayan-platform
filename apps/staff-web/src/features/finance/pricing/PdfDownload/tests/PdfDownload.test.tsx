import { pricingRoutes } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { INITIAL_SELECTION } from '@/features/finance/pricing/api';
import { PdfDownload } from '@/features/finance/pricing/PdfDownload';

const call = vi.hoisted(() => vi.fn());
const saveFile = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call,
}));
vi.mock('@/features/finance/pricing/PdfDownload/pdf-download.helpers', () => ({ saveFile }));

const PDF = { path: 'out/u/r/price-list.pdf', url: 'https://files.test/p', filename: 'x.pdf' };

function renderButton(discount = 10) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PdfDownload sel={{ ...INITIAL_SELECTION, country: 'KW', students: 2, discount }} />
    </QueryClientProvider>,
  );
  return screen.getByRole('button', { name: t.pricing.pdf.download });
}

describe('PdfDownload', () => {
  it('asks for the country list with the chosen students and discount, then saves it', async () => {
    call.mockResolvedValueOnce(PDF);
    fireEvent.click(renderButton());
    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(PDF.url));
    const [request] = call.mock.calls[0] as [{ route: unknown; body: object }];
    expect(request.route).toBe(pricingRoutes.listPdf);
    expect(request.body).toMatchObject({ country: 'KW', students: 2, discount: 10 });
  });

  it('a failed PDF shows the error and saves nothing', async () => {
    saveFile.mockClear();
    call.mockRejectedValueOnce(new Error('render failed'));
    fireEvent.click(renderButton(0));
    expect(await screen.findByText(t.pricing.pdf.failed)).toBeTruthy();
    expect(saveFile).not.toHaveBeenCalled();
  });
});
