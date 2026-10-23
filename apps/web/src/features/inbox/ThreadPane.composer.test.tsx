import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { detail, lead, message, PHONE, template } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const PATH = '/threads/%2B966501234567';
const TEMPLATES = [
  template(),
  template({ key: 'renewal_due', status: 'not_submitted' }),
  template({ key: 'teacher_lesson_reminder', params: ['teacher_name', 'lesson_slot'] }),
];
const LESSON = { id: 'l-1', starts_at: '2026-10-04T14:00:00Z', meeting_link: null, student_names: ['سهيلة'], tz: 'Asia/Riyadh' };
type Gate = 'switch_off' | 'not_configured' | null;

function renderThread(open: boolean, gate: Gate = null) {
  routeFetch(apiFetch, [
    [PATH, { ...detail([message()], { session_open: open, guardian_id: 'g-1' }), lessons: [LESSON] }],
    ['/messaging/templates', TEMPLATES],
    ['/messages/gate', { open: gate === null, reason: gate, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead({ qualification: { student_name: 'سهيلة' } })], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('thread composer inside the 24 h window (R-LEAD-02)', () => {
  it('shows the log and sends a session message with an idempotency key', async () => {
    renderThread(true);
    const log = await screen.findByRole('log', { name: t.messages.log });
    expect(within(log).getByText('السلام عليكم')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'أم سهيلة' })).toBeTruthy();
    apiSend.mockResolvedValue(message({ id: 'm-out', direction: 'outbound', status: 'queued', body: 'أهلًا' }));
    const box = screen.getByRole('textbox', { name: t.inbox.composer.messageLabel });
    fireEvent.change(box, { target: { value: '  أهلًا بحضرتك ' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(''));
    expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/text`, {
      text: 'أهلًا بحضرتك',
      clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it('a window that closed meanwhile is refused in words', async () => {
    renderThread(true);
    apiSend.mockRejectedValue(new ApiError(409, { code: 'session_closed' }));
    fireEvent.change(await screen.findByRole('textbox', { name: t.inbox.composer.messageLabel }), {
      target: { value: 'تمام' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.inbox.error.session_closed);
  });

  it('says messages wait in the queue while the kill switch is off', async () => {
    renderThread(true, 'switch_off');
    expect(await screen.findByText(t.inbox.messagingOff)).toBeTruthy();
  });

  it('a gate closed on the server (env / WhatsApp not configured) is said too, even with the switch on', async () => {
    renderThread(true, 'not_configured');
    expect(await screen.findByText(t.inbox.messagingOffServer)).toBeTruthy();
  });
});

describe('after the 24 h window: approved templates only', () => {
  it('fixed notice; this audience’s approved templates; the lesson time is picked, never typed (rule 6)', async () => {
    renderThread(false);
    expect(await screen.findByText(t.inbox.sessionClosed)).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
    const select = await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate });
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2)); // «—» + one approved
    expect(within(select).queryByText(t.templates.names.renewal_due)).toBeNull();
    expect(within(select).queryByText(t.templates.names.teacher_lesson_reminder)).toBeNull();
    fireEvent.change(select, { target: { value: 'booking_confirmation_plain' } });
    const when = screen.getByLabelText<HTMLInputElement>(t.inbox.composer.paramNames.lesson_when);
    expect(when.readOnly).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    expect((await screen.findAllByText(t.inbox.composer.pickLesson)).length).toBeGreaterThan(1);
    expect(apiSend).not.toHaveBeenCalled();

    apiSend.mockResolvedValue(message({ id: 'm-t', direction: 'outbound', status: 'queued' }));
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.pickLesson }), { target: { value: 'l-1' } });
    expect(when.value).toBe('الأحد 4 أكتوبر 17:00');
    expect(screen.getByText('تم حجز حلقة سهيلة يوم الأحد 4 أكتوبر 17:00')).toBeTruthy(); // the preview
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/template`, {
        key: 'booking_confirmation_plain',
        params: { '1': 'سهيلة', '2': 'الأحد 4 أكتوبر 17:00' },
        clientRequestId: expect.any(String),
        lessonId: 'l-1',
      }),
    );
  });

  it('an empty name is refused by its field’s name, not «المتغير»', async () => {
    renderThread(false);
    fireEvent.change(await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate }), {
      target: { value: 'booking_confirmation_plain' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.pickLesson }), { target: { value: 'l-1' } });
    fireEvent.change(screen.getByLabelText(t.inbox.composer.paramNames.student_names), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    const name = t.inbox.composer.paramNames.student_names;
    expect(await screen.findByText(t.inbox.composer.required.replace('{field}', name))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
