import type { StudentStatusRepo } from './student-status.repo';

export type StudentTz = NonNullable<Awaited<ReturnType<StudentStatusRepo['student']>>>;
