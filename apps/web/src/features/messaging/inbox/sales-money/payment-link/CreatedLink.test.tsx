import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearAllDrafts, getDraft, setDraft } from '../../composer/lib/draft-store';
import { PHONE } from '../../testing/inbox-fixture';
import { answer, openDialog } from './link-dialog.fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const P = t.paymentLinks;
const MESSAGE = P.message
  .replace('{student}', 'سهيلة')
  .replace('{lessons}', '8')
  .replace('{amount}', '270')
  .replace('{currency}', 'ر.س')
  .replace('{url}', 'https://app.example.com/pay/tok_1');

async function created(chat = {}) {
  answer(apiSend);
  const onClose = openDialog({ chat });
  const button = screen.getByRole('button', { name: P.create }) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
  await screen.findByRole('button', { name: P.sendInChat });
  return onClose;
}

describe('«رابط دفع»: the link made', () => {
  afterEach(() => {
    apiSend.mockReset();
    clearAllDrafts();
  });

  it('«إرسال في المحادثة» puts the message with the url into the chat box; nothing is sent', async () => {
    setDraft(PHONE, { text: 'مرحبًا', failed: null });
    const onClose = await created();
    fireEvent.click(await screen.findByRole('button', { name: P.sendInChat }));
    expect(getDraft(PHONE).text).toBe(`مرحبًا\n${MESSAGE}`);
    expect(onClose).toHaveBeenCalled();
    expect(apiSend.mock.calls.filter(([, path]) => String(path).startsWith('/threads'))).toHaveLength(0);
  });

  it('after the 24 h window: «يلزم قالب» instead, only «نسخ» works', async () => {
    await created({ session_open: false });
    expect(await screen.findByText(P.templateNeeded)).toBeTruthy();
    expect((screen.getByRole('button', { name: P.sendInChat }) as HTMLButtonElement).disabled).toBe(true);
    expect(getDraft(PHONE).text).toBe('');
  });

  it('«نسخ» copies the url', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await created();
    fireEvent.click(await screen.findByRole('button', { name: P.copy }));
    expect(writeText).toHaveBeenCalledWith('https://app.example.com/pay/tok_1');
    expect(await screen.findByText(P.copied)).toBeTruthy();
  });
});

