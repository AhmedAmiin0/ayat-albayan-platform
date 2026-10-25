import type { ThreadPeople, ThreadStudentView } from '@ab/shared';
import { inboxBackend, GUARDIAN_PHONE } from '@/inbox/shared/flow-backend';
import { child, family, leadOnly, sub, usedUp } from '@/inbox/subscription/people-fixtures';
import { detail, PHONE } from '@/inbox/shared/thread-fixtures';
import { booked, SUN_17 } from '@/booking/fixtures';
import { fakeBookingApi } from '@/booking/test-utils';
import { profile, quote, saved } from './fixtures';

// The chats API plus subscriptions: the guardian's child starts with a finished package, and
// POST /subscriptions starts a new one, so the chat chip and the list tag turn «مشترك» on refetch.

/** `hold`: POST /subscriptions waits for state.release(), so a test can tap twice while it is in flight. */
export function subscribeBackend({ hold = false } = {}) {
  const { backend, rows, log } = inboxBackend();
  const state = {
    child: child({ subscription: usedUp }) as ThreadStudentView,
    release: (): void => undefined,
  };
  const at = rows.findIndex((r) => r.phone_e164 === GUARDIAN_PHONE);
  const guardianRow = rows[at];
  if (guardianRow) rows[at] = { ...guardianRow, badge: 'expired' };
  const booking = fakeBookingApi();

  const people = (phone: string): ThreadPeople | undefined =>
    phone === GUARDIAN_PHONE ? family([state.child]) : phone === PHONE ? leadOnly : undefined;
  backend
    .on('GET /threads/:phone', ({ params }) => {
      const phone = params['phone'] ?? '';
      const row = rows.find((r) => r.phone_e164 === phone) ?? rows[0];
      return detail(log[phone] ?? [], { thread: row ?? detail([]).thread, people: people(phone) ?? detail([]).people });
    })
    .on('GET /students/:id', () => profile)
    .on('GET /booking/teachers', ({ path }) => booking.fetch(path))
    .on('GET /booking/slots', ({ path }) => booking.fetch(path))
    .on('POST /booking/invoice-upload-url', () => ({ bucket: 'invoices', path: 'req/0b1c.jpg', token: 'tok', signed_url: 'http://x' }))
    .on('POST /booking', () => booked(SUN_17))
    .on('POST /subscriptions/quote', () => quote)
    .on('POST /subscriptions', () => {
      state.child = child({ subscription: sub({ status: 'active', due_amount: 0, paid_amount: 180 }) });
      const now = rows.findIndex((r) => r.phone_e164 === GUARDIAN_PHONE);
      const row = rows[now];
      if (row) rows[now] = { ...row, badge: 'subscribed' };
      const row2 = saved('new-sub');
      return hold ? new Promise((resolve) => (state.release = () => resolve(row2))) : row2;
    });
  return { backend, state };
}
