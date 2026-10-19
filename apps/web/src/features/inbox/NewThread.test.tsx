import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message, PHONE, template } from './inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { NewChatForm } from './NewChatForm';
import { NewThread } from './NewThread';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

const PATH = '/threads/%2B966501234567';
const OPENER = template({ key: 'follow_up_slots', params: ['student_name'], body_ar: 'السلام عليكم، موعد {{1}}' });
const ME = ['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] }] as const;
const EMPTY = { thread: null, messages: [], has_more: false, lessons: [], people: { guardian: null, lead: null, students: [] } };

function renderNew(mode: InboxMode) {
  routeFetch(apiFetch, [ME, [PATH, EMPTY], ['/messaging/templates', [OPENER]], ['/messages/gate', { open: true, reason: null, queued: 0 }]]);
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// Owner report 2026-10-12 («it is not able to start the conversation»): a number with no message yet.
describe('starting a conversation (no thread yet)', () => {
  it('sales: the number, why a template, the approved templates; sending queues the template', async () => {
    renderNew('sales');
    expect(await screen.findByText(t.inbox.newChat.firstTemplate)).toBeTruthy();
    expect(document.body.textContent).toContain('+966 50 123 4567');
    const select = await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate });
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2));
    fireEvent.change(select, { target: { value: 'follow_up_slots' } });
    fireEvent.change(screen.getByLabelText(t.inbox.composer.paramNames.student_name), { target: { value: 'سهيلة' } });
    apiSend.mockResolvedValue(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/template`, {
        key: 'follow_up_slots',
        params: { '1': 'سهيلة' },
        clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    );
  });

  it('a booked family: the template that needs a lesson picks it from the family’s next lessons (rule 6)', async () => {
    const lesson = { id: 'l-1', starts_at: '2026-10-04T14:00:00Z', meeting_link: null, student_names: ['سهيلة'], tz: 'Asia/Riyadh' };
    routeFetch(apiFetch, [ME, [PATH, { ...EMPTY, lessons: [lesson] }], ['/messaging/templates', [template()]], ['/messages/gate', { open: true, reason: null, queued: 0 }]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>,
    );
    fireEvent.change(await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate }), { target: { value: 'booking_confirmation_plain' } });
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.pickLesson }), { target: { value: 'l-1' } });
    apiSend.mockResolvedValue(message({ id: 'm-2', direction: 'outbound', status: 'queued' }));
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/template`, expect.objectContaining({ key: 'booking_confirmation_plain', lessonId: 'l-1' })));
  });

  it('the admin gets the same first template', async () => {
    renderNew('admin');
    expect(await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate })).toBeTruthy();
  });

  it('W7 sales with no template allowed: why she cannot start it, and no form', async () => {
    routeFetch(apiFetch, [ME, ['/messaging/templates', []]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <NewThread phone={PHONE} lessons={[]} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText(t.inbox.newChat.noAllowed)).toBeTruthy();
    expect(screen.queryByText(t.inbox.newChat.firstTemplate)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
  });

  it('a teacher only reads: no composer, no number', async () => {
    renderNew('teacher');
    expect(await screen.findByText(t.inbox.noThread)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.body.textContent).not.toContain('966');
  });
});

describe('«محادثة جديدة» form', () => {
  it('opens a local Saudi number as E.164; a bad one is refused in words, nothing opens', () => {
    const onOpen = vi.fn();
    renderWithClient(<NewChatForm onOpen={onOpen} />);
    const box = screen.getByLabelText(t.inbox.newChat.phone);
    expect(box.getAttribute('dir')).toBe('ltr');
    expect(document.activeElement).toBe(box); // unfolded by the head row's toggle (InboxPage.layout.test)
    fireEvent.change(box, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.newChat.open }));
    expect(screen.getByText(t.common.phoneErrors.not_a_number)).toBeTruthy();
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.newChat.open }));
    expect(onOpen).toHaveBeenCalledWith('+966501234567');
    expect((box as HTMLInputElement).value).toBe('');
  });
});
