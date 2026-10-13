import { MAX_MEETING_INVITEES, normalizePhone, type MeetingInviteeInput, type MeetingInviteeOption } from '@ab/shared';

// The invitees picked before a create: what the chip says and what POST /meetings receives. A staff
// member or student is keyed by id, a phone by its E.164 form, so picking one twice adds it once.

export interface DraftInvitee {
  key: string;
  label: string;
  input: MeetingInviteeInput;
}

/** A search result as a draft: a staff profile, or a student (the API resolves the guardian). */
export function fromOption(option: MeetingInviteeOption): DraftInvitee {
  if (option.kind === 'staff') return { key: `staff:${option.id}`, label: option.name, input: { kind: 'staff', profileId: option.id } };
  return { key: `student:${option.id}`, label: `${option.name} · ${option.code}`, input: { kind: 'student', studentId: option.id } };
}

/** A typed phone (rule 7: E.164 only), or null when shared normalizePhone refuses it. */
export function fromPhone(typed: string): DraftInvitee | null {
  const result = normalizePhone(typed);
  if (!result.ok) return null;
  return { key: `phone:${result.e164}`, label: result.e164, input: { kind: 'phone', phone: result.e164 } };
}

/** Adds one unless it is already there or the list is full (30). */
export function addInvitee(list: readonly DraftInvitee[], next: DraftInvitee): DraftInvitee[] {
  if (list.length >= MAX_MEETING_INVITEES || list.some((d) => d.key === next.key)) return [...list];
  return [...list, next];
}

export const removeInvitee = (list: readonly DraftInvitee[], key: string): DraftInvitee[] => list.filter((d) => d.key !== key);

export const isFull = (list: readonly DraftInvitee[]): boolean => list.length >= MAX_MEETING_INVITEES;
