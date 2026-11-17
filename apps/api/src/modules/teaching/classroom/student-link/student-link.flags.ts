import type { TestFlags } from '@ab/shared';

/** One lesson of the login's own student, as the family portal asks for it (docs/31). */
export interface PortalLessonInput {
  lessonId: string;
  studentId: string;
  profileId: string;
  /** The signed-in profile's is_test (AuthUser.isTest, from the database); docs/56. */
  userIsTest?: boolean;
}

/** The link's student; is_test is the student half of the double condition (docs/56). */
export interface LinkStudent {
  id: string;
  name: string;
  is_test: boolean;
}

/** The login's flag and its student's: what canSkip('join_window') reads. */
export const flagsOf = (input: PortalLessonInput, student: LinkStudent): TestFlags => ({
  userIsTest: input.userIsTest === true,
  studentIsTest: student.is_test,
});
