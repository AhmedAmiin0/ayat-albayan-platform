import { stepsOf, type BookingDraft, type StepKey } from '@/features/booking/draft/draft';

// W9 (docs/20): «تسجيل طالب جديد» keeps what she typed and the step she reached when she closes the
// dialog (✕ or Esc) to re-read the chat. Per phone, for this tab only (module memory, never storage);
// cleared once the wizard books, and on sign-out.

export interface RegisterDraft {
  draft: BookingDraft;
  step: StepKey;
}

export type Resumed = RegisterDraft & { droppedPast?: true };

const drafts = new Map<string, RegisterDraft>();

export const registerDrafts = {
  get: (phone: string): RegisterDraft | undefined => drafts.get(phone),
  set: (phone: string, saved: RegisterDraft): void => {
    drafts.set(phone, saved);
  },
  clear: (phone: string): void => {
    drafts.delete(phone);
  },
  /** Every phone (sign-out on a shared PC; tests). */
  clearAll: (): void => drafts.clear(),
};

/**
 * The saved draft as it may resume (review M3): none when it was for another lead than the chat's
 * now; a first lesson no longer in the future is dropped (the server would book the next week's
 * occurrence, a week after what the review showed) with the other picks, back on the slot step at most,
 * and `droppedPast` says so (the dialog shows one line about it).
 */
export function resumable(saved: RegisterDraft | undefined, leadId: string | null, now: Date): Resumed | undefined {
  if (!saved || saved.draft.leadId !== leadId) return undefined;
  const at = saved.draft.startsAt;
  if (!at || Date.parse(at) > now.getTime()) return saved;
  const steps = stepsOf(saved.draft);
  const step = steps.indexOf(saved.step) > steps.indexOf('slot') ? 'slot' : saved.step;
  return { draft: { ...saved.draft, startsAt: null, extra: [] }, step, droppedPast: true };
}
