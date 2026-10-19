import type { BookingDraft, StepKey } from '@/features/booking/draft';

// W9 (docs/20): «تسجيل طالب جديد» keeps what she typed and the step she reached when she closes the
// dialog (✕ or Esc) to re-read the chat. Per phone, for this tab only (module memory, never storage);
// cleared once the wizard books.

export interface RegisterDraft {
  draft: BookingDraft;
  step: StepKey;
}

const drafts = new Map<string, RegisterDraft>();

export const registerDrafts = {
  get: (phone: string): RegisterDraft | undefined => drafts.get(phone),
  set: (phone: string, saved: RegisterDraft): void => {
    drafts.set(phone, saved);
  },
  clear: (phone: string): void => {
    drafts.delete(phone);
  },
  /** Test-only: forget every phone between tests. */
  reset: (): void => drafts.clear(),
};
