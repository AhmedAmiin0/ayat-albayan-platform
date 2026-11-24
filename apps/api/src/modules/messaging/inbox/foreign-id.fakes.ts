// Test fixtures for the inbox foreign-id tests (test-only, excluded from the build by *.fakes.ts).
import { PHONE } from './inbox.fakes';
import { TEACHER, type inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;

/** A family another teacher teaches: never in the signed-in teacher's scope. */
export const FOREIGN_PHONE = '+966559876543';
/** A message that belongs to FOREIGN_PHONE's chat. */
export const FOREIGN_MESSAGE = 'f1111111-1111-4111-8111-111111111111';

export const threadUrl = (phone: string): string => `/threads/${encodeURIComponent(phone)}`;

/** The signed-in teacher is linked and teaches PHONE's family only. */
export function teachesOwnFamily(t: App): void {
  const linked = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null };
  t.teacher.teacher.mockImplementation(async (id: string) => (id === TEACHER.id ? linked : null));
  t.teacher.phones.mockResolvedValue([PHONE]);
}
