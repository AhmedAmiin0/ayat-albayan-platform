import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearDraft } from '../../composer/lib/draft-store';
import { PHONE, thread } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { PROFILE, REPLIES } from '../lib/fixture';
import { ReplyComposer } from './ReplyComposer';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;

function show(replies = REPLIES) {
  routeFetch(apiFetch, [['/saved-replies', replies], ['/me/profile', PROFILE]]);
  renderWithClient(
    <div>
      <p>المحادثة</p>
      <ReplyComposer thread={thread({ session_open: true, display_name: 'أم أحمد' })} context={{}} leading={null} />
    </div>,
  );
}
const box = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const listbox = () => screen.findByRole('listbox', { name: S.listLabel });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearDraft(PHONE);
});

describe('the «/» list, as WhatsApp Business', () => {
  it('rows: «/title» isolated in the accent, the text on two lines, a paperclip with a file', async () => {
    show();
    type('/');
    const [first, prices] = within(await listbox()).getAllByRole('option');
    const title = first?.querySelector('bdi');
    expect(title?.textContent).toBe('/الترحيب');
    expect(title?.className).toContain('text-lapis');
    expect(first?.querySelector('[dir="auto"]')?.className).toContain('line-clamp-2');
    expect(prices?.textContent).toContain(S.hasAttachment);
  });

  it('the typed letters are bold in the title and the text', async () => {
    show();
    type('/قائمة');
    const [prices] = within(await listbox()).getAllByRole('option');
    expect([...(prices?.querySelectorAll('strong') ?? [])].map((b) => b.textContent)).toEqual(['قائمة']);
    type('/ترح');
    const [welcome] = within(await listbox()).getAllByRole('option');
    expect(welcome?.querySelector('bdi strong')?.textContent).toBe('ترح');
  });

  it('closes when the «/» is deleted, and on a press outside the composer (not inside it)', async () => {
    show();
    type('/');
    await listbox();
    type('');
    expect(screen.queryByRole('listbox')).toBeNull();
    type('/');
    await listbox();
    fireEvent.pointerDown(box());
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.pointerDown(screen.getByText('المحادثة'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('↑ wraps to the last row; Enter replaces only the «/query» and sends nothing', async () => {
    show();
    type('سطر أول\n/');
    await listbox();
    fireEvent.keyDown(box(), { key: 'ArrowUp' });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(box().value).toBe('سطر أول\nهل وصلتكم الرسالة؟');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('after Esc, deleting the «/» and typing it again opens the list again', async () => {
    show();
    type('/ت');
    await listbox();
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    type('');
    type('/');
    expect(await listbox()).toBeTruthy();
  });

  it('a new search starts on its first match', async () => {
    show();
    type('/');
    await listbox();
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    type('/ا');
    const [first] = within(await listbox()).getAllByRole('option');
    expect(first?.getAttribute('aria-selected')).toBe('true');
  });

  it('the button panel says how to use «/» when there is nothing yet', async () => {
    show([]);
    fireEvent.click(screen.getByRole('button', { name: S.open }));
    expect(await screen.findByText(S.slashHint)).toBeTruthy();
  });
});
