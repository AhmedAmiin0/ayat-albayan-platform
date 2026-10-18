import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { detail, PHONE } from '../inbox-fixture';
import { InboxModeContext } from '../mode';
import { renderWithClient, routeFetch } from '../test-utils';
import { ThreadPane } from '../ThreadPane';
import { COURSE_VIEW } from './course-fixture';
import { OPEN_SUB, paymentView, SALES_QUOTE, student } from './sales-money-fixture';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesMoneyFlow } from './SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;
const BLOCKED = { ...COURSE_VIEW, blocked: 'course_exists' as const };

function openChat(students: ReturnType<typeof student>[]) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], FAMILY)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students }],
    ['/sales/booking/course', BLOCKED],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

describe('the entries to «أيام الحلقات» (owner 2026-10-18)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('one per student with a subscription to follow, naming the child when several; opens the dialog', async () => {
    openChat([
      student({ status: 'active' }),
      student({ id: 'p', name: 'جود', status: 'pending_subscription' }),
      student({ id: 'r', name: 'يوسف', status: 'pending_renewal' }),
      student({ id: 't', name: 'مريم', status: 'trial' }),
    ]);
    const course = (name: string) => ({ name: `${t.booking.courseDays} — ${name}` });
    expect(await screen.findByRole('button', course('سهيلة'))).toBeTruthy();
    expect(screen.getByRole('button', course('جود'))).toBeTruthy();
    expect(screen.getByRole('button', course('يوسف'))).toBeTruthy();
    expect(screen.queryByRole('button', course('مريم'))).toBeNull();
    fireEvent.click(screen.getByRole('button', course('سهيلة')));
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
  });

  it('a trial student alone: no «أيام الحلقات»', async () => {
    openChat([student({ status: 'trial' })]);
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
  });

  it('right after «اشتراك جديد»: «احجز أيام الحلقات الآن», and closing it comes back to the transfer', async () => {
    routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []], ['/sales/booking/course', BLOCKED]]);
    apiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path === '/sales/subscriptions' ? OPEN_SUB : SALES_QUOTE));
    renderWithClient(<SalesMoneyFlow start="subscribe" students={[student()]} onClose={vi.fn()} />);
    const subscribe = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
    fireEvent.click(subscribe.getByRole('button', { name: t.salesMoney.saveSubscription }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.bookCourseDays }));
    const course = within(await screen.findByRole('dialog', { name: t.booking.courseDays }));
    expect(await course.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${OPEN_SUB.student.id}`);
    fireEvent.click(course.getByRole('button', { name: t.common.close }));
    expect(await screen.findByRole('dialog', { name: t.salesMoney.stepTransfer })).toBeTruthy();
  });

  it('after the transfer too: «احجز أيام الحلقات الآن» on the result', () => {
    const onBookCourse = vi.fn();
    renderWithClient(<SalesDoneStep payment={paymentView()} onClose={vi.fn()} onBookCourse={onBookCourse} />);
    fireEvent.click(screen.getByRole('button', { name: t.booking.bookCourseDays }));
    expect(onBookCourse).toHaveBeenCalled();
  });
});
