import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ThreadPane } from '../threads/pane/ThreadPane';
import { courseTitle } from './course/course-draft';
import { COURSE_VIEW } from './course/course-fixture';
import { OPEN_SUB, paymentView, SALES_QUOTE, student } from './sales-money-fixture';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesMoneyFlow } from './SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;
const BLOCKED = { ...COURSE_VIEW, blocked: 'course_exists' as const };

/** The header's «المزيد» (W3): the secondary sales actions live in it. */
const openMore = async () => fireEvent.click(await screen.findByRole('button', { name: t.common.more }));

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
    await openMore();
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

  it('a new, trial or expired student holding an unpaid package gets «أيام الحلقات» too', async () => {
    openChat([student({ status: 'trial', open: [OPEN_SUB] }), student({ id: 'e', name: 'جود', status: 'expired', open: [OPEN_SUB] })]);
    const course = (name: string) => ({ name: `${t.booking.courseDays} — ${name}` });
    await openMore();
    expect(await screen.findByRole('button', course('سهيلة'))).toBeTruthy();
    expect(screen.getByRole('button', course('جود'))).toBeTruthy();
  });

  it('right after «اشتراك جديد»: «احجز أيام الحلقات الآن», and closing it comes back to the transfer as typed', async () => {
    routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []], ['/sales/booking/course', BLOCKED]]);
    apiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path === '/sales/subscriptions' ? OPEN_SUB : SALES_QUOTE));
    renderWithClient(<SalesMoneyFlow start="subscribe" students={[student()]} onClose={vi.fn()} />);
    const subscribe = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
    fireEvent.click(subscribe.getByRole('button', { name: t.salesMoney.saveSubscription }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.bookCourseDays }));
    const transfer = within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
    fireEvent.change(transfer.getByLabelText(t.salesMoney.amount), { target: { value: '150' } });
    fireEvent.change(transfer.getByLabelText(t.salesMoney.note), { target: { value: 'دفعة أولى' } });
    fireEvent.click(transfer.getByRole('button', { name: t.booking.bookCourseDays }));
    const course = within(await screen.findByRole('dialog', { name: courseTitle(BLOCKED) }));
    expect(await course.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${OPEN_SUB.student.id}`);
    fireEvent.click(course.getByRole('button', { name: t.common.close }));
    // The transfer stayed under the course: what she typed is still there.
    const back = within(await screen.findByRole('dialog', { name: t.salesMoney.stepTransfer }));
    expect(back.getByLabelText(t.salesMoney.amount)).toHaveProperty('value', '150');
    expect(back.getByLabelText(t.salesMoney.note)).toHaveProperty('value', 'دفعة أولى');
  });

  it('after the transfer too: «احجز أيام الحلقات الآن» on the result', () => {
    const onBookCourse = vi.fn();
    renderWithClient(<SalesDoneStep payment={paymentView()} onClose={vi.fn()} onBookCourse={onBookCourse} />);
    fireEvent.click(screen.getByRole('button', { name: t.booking.bookCourseDays }));
    expect(onBookCourse).toHaveBeenCalled();
  });
});
