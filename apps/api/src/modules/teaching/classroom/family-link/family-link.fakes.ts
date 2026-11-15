// Test fixtures for the /join/<token> resolution (not shipped; *.fakes.ts is out of the build).
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { studentLinkQueries } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import type { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';
import { FamilyJoinLinks } from './family-join.links';
import { JoinLinkResolver } from './join-link.resolver';

export const FAMILY_SECRET = 'f'.repeat(40);
export const WEB_ORIGIN = 'https://app.example.test';

export const familyLinks = (secret: string | null = FAMILY_SECRET): FamilyJoinLinks =>
  new FamilyJoinLinks(secret, WEB_ORIGIN);

/** The resolver over the mocked repos (ClassroomRepo's queries(), StudentLinkRepo's fakes). */
export const resolverOf = (
  q: unknown,
  students: unknown = studentLinkQueries(),
): JoinLinkResolver =>
  new JoinLinkResolver(q as ClassroomRepo, students as StudentLinkRepo, familyLinks());
