import type { ThreadDetail } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, PHONE } from './testing/inbox-fixture';
import { renderWithClient } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const LEAD_PAGE: ThreadDetail = {
  ...detail([]),
  people: { guardian: null, lead: { id: 'lead-1', status: 'new' }, students: [] },
};
const FAMILY_PAGE: ThreadDetail = {
  ...detail([], { guardian_id: 'g-1', lead_id: null, lead_status: null }),
  people: { guardian: { id: 'g-1', name: 'أم سهيلة' }, lead: null, students: [] },
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«تسجيل الطالب» from the thread (R-LEAD-06, R-STU-02)', () => {
  it('the aside becomes the family’s panel and «تم تسجيل الطالب» stays on screen', async () => {
    let page = LEAD_PAGE;
    const routes: [string, () => unknown][] = [
      ['/threads/%2B966501234567', () => page],
      ['/messaging/templates', () => []],
      ['/settings', () => SETTINGS],
      ['/leads?', () => ({ items: [lead({ qualification: { student_name: 'عمر' } })], total: 1, page: 1, pageSize: 5 })],
      ['/students/teacher-options', () => []],
    ];
    apiFetch.mockImplementation(async (path: string) => {
      const hit = routes.find(([prefix]) => path.startsWith(prefix));
      if (!hit) throw new Error(`unrouted ${path}`);
      return hit[1]();
    });
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerStudent }));
    const dialog = within(screen.getByRole('dialog', { name: t.inbox.registerStudent }));
    apiSend.mockImplementation(async () => {
      page = FAMILY_PAGE;
      return { id: 's1', code: 'AB-0001', name: 'عمر', status: 'trial' };
    });
    fireEvent.click(dialog.getByRole('button', { name: t.common.save }));
    expect(await screen.findByRole('complementary', { name: t.inbox.subscription.title })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('complementary', { name: t.inbox.leadPanel })).toBeNull());
    expect(screen.getByRole('status').textContent).toContain(t.students.created);
  });
});
