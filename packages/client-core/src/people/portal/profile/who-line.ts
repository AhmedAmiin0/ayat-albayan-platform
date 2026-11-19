import type { PortalHome, PortalStudent } from '@ab/shared';

/** The words: each app passes its own `t.portal.app.account`. */
export interface WhoLineWords {
  /** «ولي أمر». */
  guardian: string;
  /** «طالب · رمز الطالب {code}». */
  student: string;
}

/** A student lands on their own page (docs/50 §6): their one student, or null for a guardian. */
export const ownStudent = (me: Pick<PortalHome, 'kind' | 'students'>): PortalStudent | null =>
  me.kind === 'student' ? (me.students[0] ?? null) : null;

/** «طالب · رمز الطالب AB-2041» or «ولي أمر»: the «حسابي» card and the profile's hero. */
export const whoLine = (own: PortalStudent | null, words: WhoLineWords): string =>
  own ? words.student.replace('{code}', own.code) : words.guardian;
