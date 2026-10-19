import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickTeacher, SLOT } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n';
import { PHONE, thread } from './inbox-fixture';
import { InboxModeContext } from './mode';
import { registerDrafts } from './register-drafts';
import { SalesRegisterAction } from './SalesRegisterAction';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const OTHER = '+966559999999';
const RESULT = { rule_id: 'r1', student_ids: ['s1'], guardian_ids: ['g1'], lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }], message_ids: ['m1'] };
const SLOTS = { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [{ starts_at: SLOT, ends_at: SLOT, conflicts: [] }] };

function renderAction(phone = PHONE) {
  routeFetch(apiFetch, [
    ['/settings', {}],
    ['/sales/booking/teachers', [ABRAR]],
    ['/sales/booking/slots', SLOTS],
  ]);
  apiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path === '/sales/booking/check' ? { conflicts: [] } : RESULT));
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <SalesRegisterAction thread={thread({ phone_e164: phone, lead_id: phone === PHONE ? 'lead-1' : 'lead-2' })} />
    </InboxModeContext.Provider>,
  );
}

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: t.inbox.registerNew }));
  return within(screen.getByRole('dialog', { name: t.inbox.registerNew }));
};
const field = (dialog: ReturnType<typeof openDialog>, label: string) =>
  dialog.getByRole<HTMLInputElement>('textbox', { name: (n) => n.startsWith(label) });

describe('«تسجيل طالب جديد» keeps its draft and step (docs/20 W9)', () => {
  afterEach(() => {
    vi.useRealTimers();
    registerDrafts.reset();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('Esc keeps the guardian name and the step; reopening resumes there', async () => {
    renderAction();
    let dialog = openDialog();
    fireEvent.change(field(dialog, t.guardians.name), { target: { value: 'أم جود' } });
    fireEvent.change(field(dialog, t.leads.studentName), { target: { value: 'جود' } });
    next();
    expect(await screen.findByRole('region', { name: t.booking.steps.teacher })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(registerDrafts.get(PHONE)?.step).toBe('teacher');

    dialog = openDialog();
    expect(await dialog.findByRole('region', { name: t.booking.steps.teacher })).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: t.booking.back }));
    expect(field(dialog, t.guardians.name).value).toBe('أم جود');
    expect(field(dialog, t.leads.studentName).value).toBe('جود');
  });

  it('another chat\'s phone opens a fresh draft from its own thread', async () => {
    renderAction();
    const first = openDialog();
    fireEvent.change(field(first, t.guardians.name), { target: { value: 'أم جود' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    cleanup();

    renderAction(OTHER);
    const dialog = openDialog();
    expect(dialog.getByRole('region', { name: t.booking.steps.students })).toBeTruthy();
    expect(field(dialog, t.guardians.name).value).toBe('أم سهيلة');
    expect(field(dialog, t.guardians.phone).value).toBe(OTHER);
    expect(registerDrafts.get(PHONE)?.draft.newStudent?.guardianName).toBe('أم جود');
  });

  it('a booking forgets the draft: reopening after it starts fresh', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    renderAction();
    const dialog = openDialog();
    fireEvent.change(field(dialog, t.leads.studentName), { target: { value: 'جود' } });
    next();
    await pickTeacher();
    await pickSlot();
    next();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();
    expect(registerDrafts.get(PHONE)).toBeUndefined();
  });
});
