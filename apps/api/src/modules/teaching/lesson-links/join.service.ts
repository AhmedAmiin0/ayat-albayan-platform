import { Inject, Injectable } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { firstOrigin } from '@/common/http/public-origin';
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from '@/modules/reporting/reports';
import { joinTarget } from './join-target';
import { verifyTeacherJoin } from './join-token';
import { LessonLinksRepo } from './lesson-links.repo';
import { LessonLinksSettings } from './lesson-links.settings';

/**
 * GET /join/:token (owner 2026-11-06): the signed token's lesson, still its teacher's, read now;
 * the answer is that lesson's own room (joinTarget) or null (the «invalid link» page).
 */
@Injectable()
export class TeacherJoin {
  constructor(
    private readonly repo: LessonLinksRepo,
    private readonly settings: LessonLinksSettings,
    @Inject(TEACHER_LINK_CONFIG) private readonly config: TeacherLinkConfig,
  ) {}

  async target(token: string, now: Date): Promise<string | null> {
    const { secret } = this.config;
    const payload = secret ? verifyTeacherJoin(secret, token, now) : null;
    if (!payload) return null;
    const [lesson, { meeting_link_auto: auto }] = await Promise.all([
      this.repo.joinLesson(payload.lessonId),
      this.settings.read(),
    ]);
    const origin = firstOrigin(loadEnv().WEB_ORIGIN);
    return joinTarget(lesson, { teacherId: payload.teacherId, auto, origin, now });
  }
}
