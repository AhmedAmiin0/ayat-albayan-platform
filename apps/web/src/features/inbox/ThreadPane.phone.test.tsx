import type { ThreadDetail } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, PHONE, pupil } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const PHONE_QUERIES = ['(max-width: 39.99rem)', '(max-width: 56.24rem)'];
const LEAD_PAGE: ThreadDetail = {
  ...detail([]),
  people: { guardian: null, lead: { id: 'lead-1', status: 'new' }, students: [] },
};
const FAMILY_PAGE: ThreadDetail = {
  ...detail([], { guardian_id: 'g-1', lead_id: null, lead_status: null }),
  people: { guardian: { id: 'g-1', name: 'أم سهيلة' }, lead: null, students: [pupil()] },
};

function renderThread(page: ThreadDetail) {
  routeFetch(apiFetch, [
    ['/students/teacher-options', []],
    ['/threads/%2B966501234567', page],
    ['/messaging/templates', []],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead({ qualification: { student_name: 'عمر' } })], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

describe('ThreadPane on phones (< 640px): the side panel is a full-screen sheet', () => {
  beforeEach(() => {
    // A phone is also below the shell breakpoint (900px), where the chat goes full-screen.
    const query = (media: string) => ({ matches: PHONE_QUERIES.includes(media), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(query));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a lead: «بيانات العميل والتسجيل» in the header opens the lead panel in a dialog', async () => {
    renderThread(LEAD_PAGE);
    const opener = await screen.findByRole('button', { name: t.inbox.leadSheet });
    expect(opener.closest('header')).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: t.inbox.leadPanel })).toBeNull();
    fireEvent.click(opener);
    const sheet = within(screen.getByRole('dialog', { name: t.inbox.leadSheet }));
    expect(sheet.getByRole('complementary', { name: t.inbox.leadPanel })).toBeTruthy();
    expect(await sheet.findByRole('button', { name: t.inbox.registerStudent })).toBeTruthy();
    fireEvent.click(sheet.getByRole('button', { name: t.common.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a family: «الأبناء والاشتراكات» opens the children and their packages', async () => {
    renderThread(FAMILY_PAGE);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.subscriptionSheet }));
    const sheet = within(screen.getByRole('dialog', { name: t.inbox.subscriptionSheet }));
    expect(sheet.getByRole('complementary', { name: t.inbox.subscription.title })).toBeTruthy();
    expect(sheet.getByText(pupil().name)).toBeTruthy();
  });

  it('from 640px nothing changes: the panel sits inline and there is no opener', async () => {
    vi.unstubAllGlobals();
    renderThread(LEAD_PAGE);
    expect(await screen.findByRole('complementary', { name: t.inbox.leadPanel })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.inbox.leadSheet })).toBeNull();
  });

  it('«تسجيل الطالب» in the sheet: it stays open on the family panel, the toast on top', async () => {
    let page = LEAD_PAGE;
    apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/threads/')) return page;
      if (path.startsWith('/leads?')) return { items: [lead({ qualification: { student_name: 'عمر' } })], total: 1, page: 1, pageSize: 5 };
      if (path.startsWith('/settings')) return SETTINGS;
      return [];
    });
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.leadSheet }));
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerStudent }));
    const form = within(screen.getByRole('dialog', { name: t.inbox.registerStudent }));
    apiSend.mockImplementation(async () => {
      page = FAMILY_PAGE;
      return { id: 's1', code: 'AB-0001', name: 'عمر', status: 'trial' };
    });
    fireEvent.click(form.getByRole('button', { name: t.common.save }));
    const sheet = within(await screen.findByRole('dialog', { name: t.inbox.subscriptionSheet }));
    expect(sheet.getByRole('complementary', { name: t.inbox.subscription.title })).toBeTruthy();
    await waitFor(() => expect(sheet.getByRole('status').textContent).toContain(t.students.created));
  });
});
