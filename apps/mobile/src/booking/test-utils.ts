import type { BookingTeacherOption, SlotView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { cachedList, huda, unnamed } from '@/inbox/fixtures';
import { t } from '@/lib/i18n';
import { listKey } from '@/lib/query-keys';
import { createTestQueryClient } from '@/test/query';
import { maryam, MON_19, noAvailability, slot, SUN_17 } from './fixtures';

// Test-only helpers for the quick-book screen tests (the jest.mock calls stay in each test file).

export const LEADS_KEY = listKey('/leads', { q: '' });

/** The inbox list the lead screen came from: هدى (+966, Riyadh) and an unnamed +20 lead. */
export function seededClient() {
  const client = createTestQueryClient();
  client.setQueryData(LEADS_KEY, cachedList([huda, unnamed]));
  return client;
}

/** A GET /booking/* answerer for the mocked apiFetch; change `api.slots` between calls. */
export function fakeBookingApi() {
  const api: { teachers: BookingTeacherOption[]; slots: SlotView[] } = {
    teachers: [maryam, noAvailability],
    slots: [slot(SUN_17), slot(MON_19, true)],
  };
  const fetch = (path: string): Promise<unknown> => {
    if (path.startsWith('/booking/teachers')) return Promise.resolve(api.teachers);
    if (path.startsWith('/booking/slots')) {
      return Promise.resolve({ teacher_tz: 'Africa/Cairo', step_min: 45, slots: api.slots });
    }
    return Promise.reject(new Error(`unexpected GET ${path}`));
  };
  return { api, fetch };
}

/** The chat's «اشترك» wizard: name, teacher, the package step as it is, the slot → «الفاتورة». */
export async function walkPackageToInvoice(time = '17:00') {
  await fireEvent.changeText(await screen.findByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${time}`) }));
  await screen.findByText(t.booking.invoice.hint);
}

/** A picked photo, as pickReceipt resolves it. */
export const PHOTO = {
  uri: 'file:///cache/invoice.jpg',
  mime: 'image/jpeg' as const,
  bytes: new ArrayBuffer(3),
  size: 3,
};

/** Steps 1 → 4: the child's name, the first teacher, then the free slot at `time` (Riyadh clock). */
export async function walkToConfirm(time = '17:00') {
  await fireEvent.changeText(await screen.findByLabelText(t.leads.studentName), 'يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.booking.next }));
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${time}`) }));
  await screen.findByRole('button', { name: t.booking.submit });
}
