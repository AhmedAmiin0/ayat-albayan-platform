import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { next, pickSlot, pickTeacher, ABRAR, SLOT } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n';
import { SalesRegister } from './SalesRegister';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const RESULT = {
  rule_id: 'r1',
  student_ids: ['s1'],
  guardian_ids: ['g1'],
  lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }],
  message_ids: ['m1'],
};

/** The sales mirror of the booking routes; any other path (admin booking, pricing) rejects. */
const LEAD = '7d3f2a10-1b2c-4d5e-8f90-123456789abc';
const FETCH: [string, unknown][] = [
  ['/sales/booking/teachers', [ABRAR]],
  ['/sales/booking/slots', { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [{ starts_at: SLOT, ends_at: SLOT, conflicts: [] }] }],
];

function open(search: Parameters<typeof SalesRegister>[0]['search'] = {}) {
  apiFetch.mockImplementation((path: string) => {
    const hit = FETCH.find(([prefix]) => path.startsWith(prefix));
    return hit ? Promise.resolve(hit[1]) : Promise.reject(new Error(`unmocked ${path}`));
  });
  apiSend.mockImplementation((_m: string, path: string) =>
    Promise.resolve(path === '/sales/booking/check' ? { conflicts: [] } : RESULT),
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SalesRegister search={search} />
    </QueryClientProvider>,
  );
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: (name) => name.startsWith(label) }), { target: { value } });

describe('SalesRegister «تسجيل طالب» (R-ASST-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('without a chat it points to the inbox: the API books a new family only from her own lead', () => {
    open();
    expect(screen.getByRole('heading', { level: 1, name: t.assistantPortal.register.title })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.assistantPortal.register.openInbox }).getAttribute('href')).toBe('/sales/inbox');
    expect(screen.queryByText(t.booking.next)).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('from a chat it opens on the new student form: no booking type, no student search, no package', () => {
    open({ leadId: LEAD });
    expect(screen.getByRole('heading', { level: 1, name: t.assistantPortal.register.title })).toBeTruthy();
    expect(screen.queryByText(t.booking.kind.label)).toBeNull();
    expect(screen.queryByText(t.booking.pickStudents)).toBeNull();
    expect((screen.getByRole('button', { name: t.booking.next }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('guardian + student → teacher → trial length → slot → review → booked, all through /sales/booking, no price, no invoice', async () => {
    open({ leadId: LEAD });
    type(t.leads.studentName, 'سهيلة');
    type(t.guardians.phone, '+966501234567');
    type(t.guardians.name, 'أم سهيلة');
    next();

    await pickTeacher();
    expect(screen.getByText(t.booking.trialFree)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/ر\.س|\$|سعر/);
    await pickSlot();
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    next();

    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();

    const post = apiSend.mock.calls.find(([, path]) => path === '/sales/booking');
    expect(post?.[2]).toMatchObject({
      kind: 'trial',
      teacherId: ABRAR.id,
      newStudent: { name: 'سهيلة' },
      guardian: { name: 'أم سهيلة', phone_e164: '+966501234567' },
    });
    expect(post?.[2]).toHaveProperty('leadId', LEAD);
    expect(post?.[2]).not.toHaveProperty('invoice');
    // Nothing of the admin's booking or pricing routes was used.
    for (const [path] of apiFetch.mock.calls) expect(String(path)).toMatch(/^\/sales\/booking\//);
    for (const [, path] of apiSend.mock.calls) expect(String(path)).toMatch(/^\/sales\/booking/);
    // The panel leads to my students, not to the admin's schedule.
    expect(screen.getByRole('link', { name: t.assistantPortal.register.openMyStudents }).getAttribute('href')).toBe('/sales/students');
    expect(screen.queryByRole('link', { name: t.booking.openSchedule })).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
  });
});
