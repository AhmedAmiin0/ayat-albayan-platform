import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { TeachersRepo } from './teachers.repo';

interface TeacherRequest {
  user?: AuthUser;
  params: Record<string, string | undefined>;
}

/**
 * Admin: any teacher. Teacher: only the row whose profile_id is their own (`:id` must match).
 * DB is the service role and bypasses RLS, so this mirrors `my_teacher_id()` (rule 9). R-TCH-02.
 */
@Injectable()
export class OwnTeacherGuard implements CanActivate {
  constructor(private readonly teachers: TeachersRepo) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<TeacherRequest>();
    const user = req.user;
    if (user?.role === 'admin') return true;
    if (user?.role === 'teacher' && req.params['id']) {
      if ((await this.teachers.idByProfile(user.id)) === req.params['id']) return true;
    }
    throw new ForbiddenException();
  }
}
