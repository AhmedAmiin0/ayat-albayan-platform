import type { TestFlags } from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { joinWindowConfig } from '@ab/schedule';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TestFlagReader } from '@/common/auth/test-flag';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import type { AuthUser } from '@/common/auth/verify-token';
import type { JoinLesson } from '@/modules/teaching/classroom/classroom.repo';
import { assertNotEnded, windowCheckFor } from './join-gate';
import { LessonRoleService } from './lesson-role.service';
import { RoomAdmission } from './room-admission';

/**
 * POST /lessons/:id/room/join. Who may enter is LessonRoleService's rule (admin, the lesson's
 * teacher, an assigned assistant, a salesperson: her trial as sales, any other lesson as
 * assistant). The window (settings.join_opens_before_min before to join_closes_after_min after)
 * binds teachers, assistants and salespeople; an admin may always enter, to supervise or to help,
 * until the lesson is ended for everyone (410 lesson_ended, admin too). Someone removed from this
 * lesson's room is refused 403 removed_from_room. A test login on a lesson whose students are all
 * test students skips the window (docs/56); its role check and lesson_ended stay.
 */
interface JoinInput {
  user: AuthUser;
  lessonId: string;
}

@Injectable()
export class RoomJoinService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly admission: RoomAdmission,
    private readonly settings: ClassroomSettings,
    @Optional() @Inject(TestFlagReader) private readonly flags?: TestFlagReader,
  ) {}

  async join(input: JoinInput, now = new Date()): Promise<RoomJoinResult> {
    this.admission.livekit();
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    assertNotEnded(lesson);
    if (role !== 'admin') await this.assertWindow({ user: input.user, lesson }, now);
    const name = await this.roles.nameOf(input.user, { role, lesson });
    const principal = { userId: input.user.id };
    return this.admission.admit({ lessonId: lesson.id, role, name, principal }, now);
  }

  private async assertWindow(
    ctx: { user: AuthUser; lesson: JoinLesson },
    now: Date,
  ): Promise<void> {
    const check = windowCheckFor(await this.testFlagsOf(ctx.user, ctx.lesson.id));
    check(ctx.lesson, now, joinWindowConfig(await this.settings.read()));
  }

  /** The student half is read only for a test login (a real one never skips). */
  private async testFlagsOf(user: AuthUser, lessonId: string): Promise<TestFlags> {
    const userIsTest = user.isTest === true;
    const studentIsTest = userIsTest && ((await this.flags?.ofLesson(lessonId)) ?? false);
    return { userIsTest, studentIsTest };
  }
}
