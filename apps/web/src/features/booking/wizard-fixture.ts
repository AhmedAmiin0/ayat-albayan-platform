import type { BookingTeacherOption } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { t } from '@/lib/i18n';

// Test data only (imported by the wizard *.test.tsx): API responses keyed by path prefix.

export const STUDENT_ID = '0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b';
export const SISTER_ID = '1c6f8e2b-3d4e-4f5a-8b9c-8d7e6f5a4b3c';
export const ABRAR: BookingTeacherOption = {
  id: '6f1c2a3e-1b2c-4d5e-8f90-123456789abc',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  students_count: 3,
  max_students: 10,
  has_availability: true,
};
export const NOOR: BookingTeacherOption = { ...ABRAR, id: 'n-1', display_name_ar: 'نور', has_availability: false };
export const SLOT = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh

const PROFILE = {
  id: STUDENT_ID,
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'trial',
  guardian_id: 'g-1',
  program: 'quran',
  tz: 'Asia/Riyadh',
  teacher_gender_pref: 'female',
  guardian: { id: 'g-1', name: 'أم سهيلة', phone_e164: '+966501234567' },
  siblings: [{ id: SISTER_ID, code: 'AB-0184', name: 'جود', status: 'trial' }],
};

const QUOTE = { total: 1080, currency: 'SAR', fx: null };

export const RESPONSES: [string, unknown][] = [
  [`/students/${STUDENT_ID}`, PROFILE],
  ['/guardians/g-1', { id: 'g-1', name: 'أم سهيلة', phone_e164: '+966501234567', country: 'SA', tz: 'Asia/Riyadh' }],
  ['/booking/teachers', [ABRAR, NOOR]],
  ['/booking/slots', { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [{ starts_at: SLOT, ends_at: SLOT, conflicts: [] }] }],
  ['/pricing/quote', QUOTE],
];

export function respond(path: string): Promise<unknown> {
  const hit = RESPONSES.find(([prefix]) => path.startsWith(prefix));
  return hit ? Promise.resolve(hit[1]) : Promise.reject(new Error(`unmocked ${path}`));
}

export const next = () => fireEvent.click(screen.getByRole('button', { name: t.booking.next }));

/** Teacher, then on to the length + package step. */
export async function pickTeacher(): Promise<void> {
  fireEvent.click(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }));
  next();
}

/** From the package step on to the slot grid, and pick Sunday 17:00. */
export async function pickSlot(): Promise<void> {
  next();
  const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} `) });
  fireEvent.click(within(sunday).getByRole('button', { name: /17:00/ }));
}

/** Teacher → package (as preset) → slot (Sunday 17:00): the steps every path shares. */
export async function pickTeacherAndSlot(): Promise<void> {
  await pickTeacher();
  await pickSlot();
}

export const INVOICE_PATH = 'req-1/abc.png';

/**
 * The invoice step with a device upload (R-PAY-03): a PNG goes through the signed URL
 * (`uploadToSignedUrl`, mocked by the test file) and shows its preview. Call on the invoice step.
 */
export async function addInvoice(uploadToSignedUrl: Mock): Promise<void> {
  URL.createObjectURL = vi.fn(() => 'blob:invoice');
  uploadToSignedUrl.mockResolvedValue({ error: null });
  const input = screen.getByLabelText(t.booking.invoice.upload);
  fireEvent.change(input, { target: { files: [new File(['x'], 'inv.png', { type: 'image/png' })] } });
  await screen.findByRole('button', { name: t.booking.invoice.remove });
}

/**
 * apiSend by path: POST /booking/check (the slot step's series check) answers «no clash»,
 * POST /booking/invoice-upload-url a signed upload; each POST /booking takes the next answer (an
 * Error rejects).
 */
export function routeSend(apiSend: Mock, answers: unknown[]): void {
  apiSend.mockImplementation((_method: string, path: string) => {
    if (path === '/booking/check') return Promise.resolve({ conflicts: [] });
    if (path === '/booking/invoice-upload-url') {
      return Promise.resolve({ bucket: 'invoices', path: INVOICE_PATH, token: 'tok', signed_url: 'https://x' });
    }
    const answer = answers.shift();
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
}

/** The bodies of every POST /booking, in order (series checks left out). */
export const bookingBodies = (apiSend: Mock): Record<string, unknown>[] =>
  apiSend.mock.calls.filter(([, path]) => path === '/booking').map(([, , body]) => body as Record<string, unknown>);
