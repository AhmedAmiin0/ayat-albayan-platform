import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { pageView, PUBLIC_ID } from './page.fixture';
import { ReportPage } from './ReportPage';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReportPage publicId={PUBLIC_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('ReportPage (/report/:publicId)', () => {
  it("the saved report read-only, the teacher's file and the PDF as links", async () => {
    fetchMock.mockImplementation(() => json(200, pageView()));
    open();
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`http://api.test/report-pages/${PUBLIC_ID}`);
    expect(screen.getByText(t.reportPage.teacher.replace('{name}', 'أبرار'))).toBeTruthy();
    const file = screen.getByRole('link', { name: t.reportPage.file.replace('{n}', '1') });
    expect(file.getAttribute('href')).toBe('https://files.example/a');
    const pdf = screen.getByRole('link', { name: t.reportPage.downloadPdf });
    expect(pdf.getAttribute('href')).toBe('https://files.example/report.pdf');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('the PDF still being prepared: says so', async () => {
    fetchMock.mockImplementation(() => json(200, pageView({ pdf: null })));
    open();
    expect(await screen.findByText(t.reportPage.pdfPending)).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.reportPage.downloadPdf })).toBeNull();
  });

  it.each([401, 404])('%i: «not found», never whose report it is', async (status) => {
    fetchMock.mockImplementation(() => json(status, { code: 'report_not_found' }));
    open();
    expect(await screen.findByText(t.reportPage.notFound)).toBeTruthy();
    expect(screen.queryByText('سهيلة')).toBeNull();
  });
});
