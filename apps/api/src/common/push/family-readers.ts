import { joinNames, lessonWhenText } from '@ab/shared';
import type { PushTarget } from './push.service';

// Who in a family hears about a student (docs/50 §5 item 6), each login in its own zone.

/** The select of a FamilyStudent under students(...). */
export const FAMILY_STUDENT_SELECT = 'id, name, tz, profile_id, guardian:guardians(profile_id, tz)';

/** A student as the pushes read it, with the guardian's login. */
export interface FamilyStudent {
  id: string;
  name: string;
  tz: string;
  /** The student's own login, if any. */
  profile_id: string | null;
  guardian: { profile_id: string | null; tz: string } | null;
}

/** One login to tell, in its own zone, about the students of theirs the event names. */
interface Reader {
  profileId: string;
  tz: string;
  names: string[];
  studentId: string;
}

/** Each student's guardian login and own login (an adult who is their own guardian: once). */
function loginsOf(s: FamilyStudent): { profileId: string; tz: string }[] {
  const guardian = s.guardian?.profile_id
    ? [{ profileId: s.guardian.profile_id, tz: s.guardian.tz }]
    : [];
  const shared = s.profile_id === s.guardian?.profile_id;
  const own = s.profile_id && !shared ? [{ profileId: s.profile_id, tz: s.tz }] : [];
  return [...guardian, ...own];
}

/** Every login to tell, siblings in one lesson under one guardian named together. */
export function familyReaders(students: readonly FamilyStudent[]): Reader[] {
  const byProfile = new Map<string, Reader>();
  const logins = students.flatMap((s) => loginsOf(s).map((login) => ({ ...login, s })));
  for (const { profileId, tz, s } of logins) {
    const found = byProfile.get(profileId);
    if (found) found.names.push(s.name);
    else byProfile.set(profileId, { profileId, tz, names: [s.name], studentId: s.id });
  }
  return [...byProfile.values()];
}

/** What every target of one event shares: its kind, subject (the dedup key) and data. */
type FamilyEvent = Omit<PushTarget, 'vars' | 'profileIds'>;

/**
 * One push per family login: {student} and {when} (the lesson's time on their clock) filled, the
 * reader's student in the data. PushService keys each `{kind}:{subject}:{profile}` (rule 8).
 */
export function familyTargets(
  event: FamilyEvent,
  input: { at: string; students: readonly FamilyStudent[] },
): PushTarget[] {
  return familyReaders(input.students).map((r) => ({
    ...event,
    vars: { student: joinNames(r.names), when: lessonWhenText(new Date(input.at), r.tz) },
    data: { ...event.data, studentId: r.studentId },
    profileIds: [r.profileId],
  }));
}
