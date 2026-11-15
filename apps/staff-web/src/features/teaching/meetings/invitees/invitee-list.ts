import { MAX_MEETING_INVITEES, normalizePhone, type MeetingInviteeInput, type MeetingInviteeOption } from '@ab/shared';

// The invitees picked in the dialog: a staff profile, a student (the API resolves the guardian's
// phone) or a typed phone (E.164 only, rule 7). At most 30, each once.

export interface PickedInvitee {
  /** kind:id, or phone:+E164: the same invitee twice is one chip. */
  key: string;
  name: string;
  input: MeetingInviteeInput;
}

/** A staff or student search result as a chip. */
export function fromOption(o: MeetingInviteeOption): PickedInvitee {
  return o.kind === 'staff'
    ? { key: `staff:${o.id}`, name: o.name, input: { kind: 'staff', profileId: o.id } }
    : { key: `student:${o.id}`, name: o.name, input: { kind: 'student', studentId: o.id } };
}

/** A typed number: the chip when it is a valid E.164 number, else null. */
export function fromPhone(typed: string): PickedInvitee | null {
  const p = normalizePhone(typed);
  if (!p.ok) return null;
  return { key: `phone:${p.e164}`, name: p.e164, input: { kind: 'phone', phone: p.e164 } };
}

export const isFull = (list: readonly PickedInvitee[]): boolean => list.length >= MAX_MEETING_INVITEES;

/** Adds once; a full list stays as it is. */
export function addInvitee(list: readonly PickedInvitee[], item: PickedInvitee): PickedInvitee[] {
  if (list.some((p) => p.key === item.key) || isFull(list)) return [...list];
  return [...list, item];
}

export const removeInvitee = (list: readonly PickedInvitee[], key: string): PickedInvitee[] => list.filter((p) => p.key !== key);

export const hasInvitee = (list: readonly PickedInvitee[], key: string): boolean => list.some((p) => p.key === key);
