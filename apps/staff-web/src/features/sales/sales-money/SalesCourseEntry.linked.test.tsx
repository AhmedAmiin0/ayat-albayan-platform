import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane';
import { LinkedCourseContext } from './course/linked-course';
import { COURSE_VIEW } from './course/course-fixture';
import { student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => false }),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const FAMILY = {
  guardian_id: 'g-1',
  lead_id: null,
  lead_status: null,
  guardian_name: 'أم سهيلة',
} as const;
const BLOCKED = { ...COURSE_VIEW, blocked: 'course_exists' as const };

const NO_CHAT = {
  thread: null,
  messages: [],
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
};

function openChat(linked: string | null, chat: object = detail([], FAMILY)) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] }],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/threads/%2B966501234567', chat],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students: [student({ status: 'active' })] }],
    ['/sales/booking/course', BLOCKED],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <LinkedCourseContext.Provider value={linked}>
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </LinkedCourseContext.Provider>
    </InboxModeContext.Provider>,
  );
}

// «تم الدفع: احجز أيام الحلقات» (owner 2026-11-06): the notice opens the chat with the wizard.
describe('a «احجز أيام الحلقات» notice on the web', () => {
  afterEach(() => apiFetch.mockReset());

  it('the chat opens with that student’s «أيام الحلقات» dialog', async () => {
    openChat(student().id);
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${student().id}`);
  });

  it('a number with no chat yet (PR #642 review): the dialog still opens', async () => {
    openChat(student().id, NO_CHAT);
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(screen.getByText(t.inbox.noThread)).toBeTruthy();
  });

  it('without it the chat opens as usual', async () => {
    openChat(null);
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
  });
});
