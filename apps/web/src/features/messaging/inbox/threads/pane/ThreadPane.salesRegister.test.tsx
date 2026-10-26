import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickTeacher, SLOT } from '@/features/teaching/booking/wizard-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '../../testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '../../shared/mode';
import { renderWithClient } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const RESULT = { rule_id: 'r1', student_ids: ['s1'], guardian_ids: ['g1'], lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }], message_ids: ['m1'] };
const SLOTS = { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [{ starts_at: SLOT, ends_at: SLOT, conflicts: [] }] };

function open(mode: InboxMode, patch: Parameters<typeof detail>[1] = {}) {
  const routes: [string, unknown][] = [
    ['/threads/%2B966501234567', detail([], patch)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/booking/teachers', [ABRAR]],
    ['/sales/booking/slots', SLOTS],
  ];
  apiFetch.mockImplementation((path: string) => {
    const hit = routes.find(([prefix]) => path.startsWith(prefix));
    return hit ? Promise.resolve(hit[1]) : Promise.reject(new Error(`unmocked ${path}`));
  });
  apiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path === '/sales/booking/check' ? { conflicts: [] } : RESULT));
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: (name) => name.startsWith(label) }), { target: { value } });

describe('«تسجيل طالب جديد» in a sales chat (R-ASST-01, docs/16)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('opens the sales wizard prefilled from the thread: the number and the WhatsApp name, no booking type', async () => {
    open('sales');
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerNew }));
    const dialog = within(screen.getByRole('dialog', { name: t.inbox.registerNew }));
    expect(dialog.getByRole<HTMLInputElement>('textbox', { name: (n) => n.startsWith(t.guardians.phone) }).value).toBe(PHONE);
    expect(dialog.getByRole<HTMLInputElement>('textbox', { name: (n) => n.startsWith(t.guardians.name) }).value).toBe('أم سهيلة');
    expect(dialog.queryByText(t.booking.kind.label)).toBeNull();
    expect(dialog.queryByText(t.booking.pickStudents)).toBeNull();
  });

  it('books through /sales/booking with the lead (credited to the salesperson), then «ارجع للمحادثة» closes on the same chat', async () => {
    open('sales');
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerNew }));
    type(t.leads.studentName, 'سهيلة');
    next();
    await pickTeacher();
    expect(document.body.textContent).not.toMatch(/ر\.س|\$|سعر/);
    await pickSlot();
    next();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();
    const post = apiSend.mock.calls.find(([, path]) => path === '/sales/booking');
    expect(post?.[2]).toMatchObject({ kind: 'trial', teacherId: ABRAR.id, leadId: 'lead-1', newStudent: { name: 'سهيلة' } });
    expect(post?.[2]).toMatchObject({ guardian: { name: 'أم سهيلة', phone_e164: PHONE, source: 'facebook_ad' } });
    expect(post?.[2]).not.toHaveProperty('invoice');
    for (const [, path] of apiSend.mock.calls) expect(String(path)).toMatch(/^\/sales\/booking/);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.subscription.backToChat }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { level: 2, name: 'أم سهيلة' })).toBeTruthy();
  });

  it('a lead assigned to someone else: the API refuses (not_your_lead) and the wizard says why', async () => {
    open('sales');
    apiSend.mockImplementation((_m: string, path: string) =>
      path === '/sales/booking/check' ? Promise.resolve({ conflicts: [] }) : Promise.reject(new ApiError(403, { code: 'not_your_lead' })),
    );
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerNew }));
    type(t.leads.studentName, 'سهيلة');
    next();
    await pickTeacher();
    await pickSlot();
    next();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.error.not_your_lead)).toBeTruthy();
  });

  it('only for sales, and only on a lead that is not a family yet', async () => {
    open('admin');
    await screen.findByRole('heading', { level: 2, name: 'أم سهيلة' });
    expect(screen.queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
  });

  it.each([
    ['a guardian', { guardian_id: 'g-1', lead_id: null, lead_status: null }],
    ['a converted lead', { lead_status: 'converted' as const }],
    ['a lost lead', { lead_status: 'lost' as const }],
  ])('no action on %s', async (_label, patch) => {
    open('sales', patch);
    await screen.findByRole('heading', { level: 2 });
    expect(screen.queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
  });
});
