import { priceListText, type PriceListResponse } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import {
  isOff,
  lastAsked,
  press,
  shownText,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const PHONE = '+966501234567';
const LIST = '/pricing/list?country=SA&students=1&discount=0&rounding=nearest';
const textOf = (path: string) =>
  priceListText(fakePricingApi(path) as PriceListResponse, ar.pricing);
const TEXT = textOf(LIST);
const q = t.inbox.quote;
const gates = () => [q.send, q.edit, q.copy].map(isOff);

async function showList(open = true) {
  const done = await showSheet({ session_open: open });
  press(q.mode.all);
  await waitFor(() => expect(shownText()).toBe(TEXT));
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

it('«أرسل العرض» posts the whole list as one chat text', async () => {
  apiSend.mockImplementation(async (_m: string, _p: string, b: { text: string }) => ({
    id: 'm1',
    body: b.text,
  }));
  const { onClose } = await showList();
  press(q.send);
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(apiSend).toHaveBeenCalledTimes(1);
  const [method, path, body] = apiSend.mock.calls[0] as [string, string, { text: string }];
  expect([method, path, body.text]).toEqual([
    'POST',
    `/threads/${encodeURIComponent(PHONE)}/text`,
    TEXT,
  ]);
});

it('«عدّل قبل الإرسال» puts the list in the box after what was typed, and sends nothing', async () => {
  setDraft(PHONE, { text: 'مرحبًا', failed: null });
  const { onClose, onFilled } = await showList();
  press(q.edit);
  expect(getDraft(PHONE).text).toBe(`مرحبًا\n${TEXT}`);
  expect(onFilled).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
  expect(apiSend).not.toHaveBeenCalled();
});

it('outside the 24 h window the list can only be copied', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await showList(false);
  expect(screen.getByText(t.inbox.sessionClosed)).toBeTruthy();
  expect(gates()).toEqual([true, true, false]);
  press(q.copy);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXT));
  expect(await screen.findByText(q.copied)).toBeTruthy();
  expect(apiSend).not.toHaveBeenCalled();
});

it('a clipboard that refuses says so, and the sheet stays open', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const { onClose } = await showList();
  press(q.copy);
  expect(await screen.findByText(q.copyFailed)).toBeTruthy();
  expect(writeText).toHaveBeenCalledWith(TEXT);
  expect(onClose).not.toHaveBeenCalled();
});

it('a list that fails shows the error, no text, and nothing may leave', async () => {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/pricing/list')) throw new Error('down');
    return fakePricingApi(path);
  });
  await showSheet();
  press(q.mode.all);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByTestId('quote-text')).toBeNull();
  expect(gates()).toEqual([true, true, true]);
});

it('while the next list loads the old one stays, and nothing may leave until it is in', async () => {
  const held: (() => void)[] = [];
  apiFetch.mockImplementation((path: string) =>
    path.includes('students=2')
      ? new Promise((resolve) => held.push(() => resolve(fakePricingApi(path))))
      : Promise.resolve(fakePricingApi(path)),
  );
  await showList();
  press(t.pricing.increase);
  expect(gates()).toEqual([true, true, true]);
  await waitFor(() => expect(lastAsked(apiFetch, '/pricing/list')).toContain('students=2'));
  expect(shownText()).toBe(TEXT);
  expect(gates()).toEqual([true, true, true]);
  held.forEach((release) => release());
  const next = textOf(LIST.replace('students=1', 'students=2'));
  await waitFor(() => expect(shownText()).toBe(next));
  expect(gates()).toEqual([false, false, false]);
});
