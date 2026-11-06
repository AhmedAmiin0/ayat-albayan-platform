import type { UserRole } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { ReportPageRepo } from './report-page.repo';
import type { PageFacts } from './report-page.types';

interface ReaderInput {
  user: AuthUser;
  studentId: string;
  facts: PageFacts;
}
type Check = (input: ReaderInput) => boolean | Promise<boolean>;

const isTeacherOf: Check = ({ user, facts }) => facts.teacher.profile_id === user.id;
const isGuardianOf: Check = ({ user, facts }) => facts.student.guardian?.profile_id === user.id;
const isStudent: Check = ({ user, facts }) => facts.student.profile_id === user.id;

/**
 * Who reads a submitted report while signed in (owner 2026-11-06): an admin; the lesson's teacher;
 * the student's guardian (or the student's own account); and the student's OWNING assistant
 * (sales or classroom assistant: her leads' families and the students she brought), read-only.
 * Nobody else: another assistant, teacher or family is refused.
 */
@Injectable()
export class ReportReaders {
  constructor(private readonly repo: ReportPageRepo) {}

  private readonly owner: Check = ({ user, studentId }) => this.repo.owns(user.id, studentId);

  private readonly checks: Record<UserRole | 'none', Check> = {
    none: () => false,
    admin: () => true,
    teacher: isTeacherOf,
    guardian: isGuardianOf,
    student: isStudent,
    sales: this.owner,
    assistant: this.owner,
  };

  async canRead(input: ReaderInput): Promise<boolean> {
    return this.checks[input.user.role ?? 'none'](input);
  }
}
