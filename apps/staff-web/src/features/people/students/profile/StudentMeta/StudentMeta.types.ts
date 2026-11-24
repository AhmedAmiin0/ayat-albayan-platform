import type { StudentProfile } from '@ab/shared';

export interface StudentMetaProps {
  student: Pick<StudentProfile, 'code' | 'guardian' | 'meeting_link'>;
}
