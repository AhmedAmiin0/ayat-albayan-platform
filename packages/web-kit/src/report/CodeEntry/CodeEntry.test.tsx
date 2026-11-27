import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PUBLIC_ID } from '@ab/web-kit/report/page.fixture';
import { CodeEntry } from './CodeEntry';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const VERIFY = `http://api.test/public/report-pages/${PUBLIC_ID}/verify`;
const g = () => t.reportPage.gate;

function answer(status: number, code?: string) {
  const body = code === undefined ? null : JSON.stringify({ code });
  fetchMock.mockResolvedValue(new Response(body, { status }));
}

function open(onVerified = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CodeEntry publicId={PUBLIC_ID} onVerified={onVerified} />
    </QueryClientProvider>,
  );
  return onVerified;
}

const verifyButton = () => screen.getByRole('button', { name: g().verify });
const typeCode = (code: string) =>
  fireEvent.change(screen.getByLabelText(g().code), { target: { value: code } });

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('CodeEntry: the six digits from WhatsApp', () => {
  it('verify waits for a code; blanks do not count', () => {
    open();
    expect(screen.getByText(g().sent)).toBeTruthy();
    expect(verifyButton()).toHaveProperty('disabled', true);
    typeCode('   ');
    expect(verifyButton()).toHaveProperty('disabled', true);
  });

  it('a right code is sent for this report and calls onVerified', async () => {
    answer(204);
    const onVerified = open();
    typeCode('123456');
    fireEvent.click(verifyButton());
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(VERIFY);
    expect(init?.body).toBe(JSON.stringify({ code: '123456' }));
  });

  it('a wrong code says so and does not call onVerified', async () => {
    answer(401, 'invalid_code');
    const onVerified = open();
    typeCode('000000');
    fireEvent.click(verifyButton());
    expect(await screen.findByText(g().invalid)).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });
});
