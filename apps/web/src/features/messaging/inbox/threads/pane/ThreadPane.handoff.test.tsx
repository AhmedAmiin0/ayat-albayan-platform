import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, message, PHONE } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const LINK = 'https://wa.me/966501234567?text=x';
const FAILED = message({ id: 'm-f', direction: 'outbound', status: 'failed', body: 'تذكير بالحلقة', error_code: '131049', click_to_chat: LINK });

// The tab the click opens right away (a later window.open is popup-blocked); wa.me goes in it only
// once the server holds the row.
const tab = { opener: {} as unknown, location: { replace: vi.fn() }, close: vi.fn() };
let open: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([FAILED])],
    ['/messaging/templates', []],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
});
afterEach(() => {
  vi.restoreAllMocks();
  apiFetch.mockReset();
  apiSend.mockReset();
  tab.location.replace.mockReset();
  tab.close.mockReset();
});

async function clickToChat() {
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
  await screen.findByRole('log');
  const row = screen.getByText('تذكير بالحلقة').closest('article');
  if (!(row instanceof HTMLElement)) throw new Error('no bubble');
  const link = within(row).getByRole('link', { name: t.messages.clickToChat });
  expect(link.getAttribute('href')).toBe(LINK);
  fireEvent.click(link);
  expect(open).toHaveBeenCalledWith('', '_blank');
  expect(tab.opener).toBeNull();
}

describe('«أرسلها بنفسك من واتساب» (R-MSG-03)', () => {
  it('tells the server first, then opens wa.me in the tab (the row is held: no second send)', async () => {
    apiSend.mockResolvedValue({ ...FAILED, error_code: 'handed_off' });
    await clickToChat();
    expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-f/hand-off');
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith(LINK));
    expect(tab.close).not.toHaveBeenCalled();
  });

  it('the sender claimed it meanwhile (409 not_manual): no WhatsApp, and the admin is told why', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'not_manual' }));
    await clickToChat();
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect((await screen.findByRole('alert')).textContent).toBe(t.messages.alreadySending);
  });
});
