import type { TemplateHealthView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { LINES, lineSync } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «القوالب حسب الرقم» (owner 2026-10-18): each number syncs with its own WABA from its own block.

const p = t.templates.perNumber;
const chatName = t.enums.waLine.chat;
const syncChat = () => screen.getByRole('button', { name: p.syncFor.replace('{line}', chatName) });
const block = (line: 'notifications' | 'chat') => {
  const el = screen.getAllByTestId('template-line').find((b) => b.getAttribute('data-line') === line);
  if (!el) throw new Error(`no block ${line}`);
  return within(el);
};

async function renderLines() {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [template()]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
  await screen.findByText(t.templates.names.booking_confirmation_plain);
  await screen.findAllByText('waba-c');
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template lines: one sync per number', () => {
  it('each block names its number, WABA and driver; nothing synced yet', async () => {
    await renderLines();
    expect(block('notifications').getByText(t.enums.waLine.notifications)).toBeTruthy();
    expect(block('chat').getByText('waba-c').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(block('chat').getByText(t.integrations.options.kapso)).toBeTruthy();
    expect(block('chat').getByText(t.templates.phoneUnknown)).toBeTruthy();
    expect(screen.getAllByText(p.neverSynced)).toHaveLength(2);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('the chat block posts only its line, waits, then shows what Meta has and a success toast', async () => {
    await renderLines();
    let answer: (v: TemplateHealthView) => void = () => undefined;
    apiSend.mockReturnValue(new Promise<TemplateHealthView>((r) => (answer = r)));
    fireEvent.click(syncChat());
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/health', { line: 'chat' }));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(syncChat().textContent).toBe(p.syncing);
    expect((syncChat() as HTMLButtonElement).disabled).toBe(true);
    const welcome = template({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat' });
    const sync = lineSync({ line: 'chat', meta_count: 7, synced: 3, imported: ['academy_welcome'], skipped: [{ name: 'promo_x', reason: 'not approved' }] });
    answer({ lines: [sync], templates: [template(), welcome] });
    expect((await screen.findByRole('status')).textContent).toContain(p.synced.replace('{line}', chatName));
    const chat = block('chat');
    expect(chat.getByText(p.metaCount).nextElementSibling?.textContent).toBe('7');
    expect(chat.getByText(p.checkedRows).nextElementSibling?.textContent).toBe('3');
    expect(chat.getAllByText('academy_welcome')[0]?.closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(chat.getByText('not approved').closest('li')?.textContent).toBe(p.skipReason.replace('{name}', 'promo_x').replace('{reason}', 'not approved'));
    await waitFor(() => expect(syncChat().textContent).toBe(p.sync));
    expect(await screen.findAllByText('academy_welcome')).not.toHaveLength(0);
    expect(block('notifications').getByText(p.neverSynced)).toBeTruthy();
  });

  it('a refused chat read says why in its block and as an error toast, never «تمت المزامنة»', async () => {
    await renderLines();
    const failed = lineSync({ line: 'chat', ok: false, error: 'meta_error', message: 'Invalid OAuth access token' });
    apiSend.mockResolvedValue({ lines: [failed], templates: [template()] });
    fireEvent.click(syncChat());
    const text = p.syncFailed.replace('{line}', chatName).replace('{error}', t.templates.error.meta_error.replace('{message}', 'Invalid OAuth access token'));
    expect((await screen.findByRole('status')).textContent).toContain(text);
    expect(block('chat').getByText(text)).toBeTruthy();
    expect(screen.queryByText(p.synced.replace('{line}', chatName))).toBeNull();
  });
});
