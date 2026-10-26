import { offerText, type Quote } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { t } from '@/lib/i18n/i18n';
import { getDraft, setDraft } from '../lib/draft-store';
import { thread } from '../../testing/inbox-fixture';
import { renderWithClient } from '../../testing/test-utils';
import { QuoteDialog } from './QuoteDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const PHONE = '+966501234567';
const SA = '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=0';
const TEXT = offerText(fakePricingApi(SA) as Quote, ar.pricing);
const q = t.inbox.quote;
const button = (name: string) => screen.getByRole('button', { name });

async function show(open = true) {
  const done = { onClose: vi.fn(), onFilled: vi.fn() };
  renderWithClient(<QuoteDialog thread={thread({ phone_e164: PHONE, session_open: open })} {...done} />);
  await screen.findByTestId('quote-text');
  return done;
}

beforeEach(() => {
  apiFetch.mockImplementation(async (path: string) => fakePricingApi(path));
  setDraft(PHONE, { text: '', failed: null });
});
afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  cleanup();
});

it('«أرسل العرض» posts the offer once through the chat text route, even on a double click', async () => {
  apiSend.mockReturnValue(new Promise(() => undefined));
  await show();
  const send = button(q.send);
  fireEvent.click(send);
  fireEvent.click(send);
  await waitFor(() => expect(apiSend).toHaveBeenCalled());
  expect(apiSend).toHaveBeenCalledTimes(1);
  const [method, path, body] = apiSend.mock.calls[0] as [string, string, { text: string; clientRequestId: string }];
  expect([method, path, body.text]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/text`, TEXT]);
  expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
});

it('a sent offer closes the sheet', async () => {
  apiSend.mockResolvedValue({ id: 'm1' });
  const { onClose } = await show();
  fireEvent.click(button(q.send));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it('«عدّل قبل الإرسال» puts the offer in the box after what was typed, and sends nothing', async () => {
  setDraft(PHONE, { text: 'مرحبًا', failed: null });
  const { onClose, onFilled } = await show();
  fireEvent.click(button(q.edit));
  expect(getDraft(PHONE).text).toBe(`مرحبًا\n${TEXT}`);
  expect(onFilled).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
  expect(apiSend).not.toHaveBeenCalled();
});

it('outside the 24 h window: send and edit are disabled with the closed note; copy still works', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await show(false);
  expect(screen.getByText(t.inbox.sessionClosed)).toBeTruthy();
  expect(button(q.send).hasAttribute('disabled')).toBe(true);
  expect(button(q.edit).hasAttribute('disabled')).toBe(true);
  fireEvent.click(button(q.copy));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXT));
  expect(await screen.findByText(q.copied)).toBeTruthy();
  expect(apiSend).not.toHaveBeenCalled();
});

it('a 409 session_closed refetches the thread so the sheet locks send and edit', async () => {
  const { ApiError } = await import('@/lib/http/api');
  apiSend.mockRejectedValue(new ApiError(409, { code: 'session_closed' }));
  const client = renderWithClient(<QuoteDialog thread={thread({ phone_e164: PHONE, session_open: true })} onClose={vi.fn()} onFilled={vi.fn()} />);
  const refetch = vi.spyOn(client, 'invalidateQueries');
  await screen.findByTestId('quote-text');
  fireEvent.click(button(q.send));
  expect(await screen.findByText(t.inbox.error.session_closed)).toBeTruthy();
  await waitFor(() => expect(refetch).toHaveBeenCalledWith({ queryKey: ['threads'] }));
});
