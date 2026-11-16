import { guestJoinSchema, joinWindow, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { assertLessonHeld, assertWindowOpen } from './join-gate';
import { PublicJoinLimit } from './join-limit';
import { JoinLinkResolver } from '@/modules/teaching/classroom/family-link/join-link.resolver';
import { RoomAdmission } from './room-admission';

const MS = 1000;
const ONE_DAY_S = 86_400;

/**
 * POST /public/join/:linkToken (no login): the token in the path is the whole credential, a random
 * link token or the family app's signed one (JoinLinkResolver). A fresh identity per call, so the
 * same link opened by two people (or two windows) never kicks anyone.
 * The link lives as long as its lesson's room: the lesson's CURRENT window decides (a lesson moved
 * later keeps its link, the stored expires_at was the old time's), a revoked row is refused 410
 * link_expired, a cancelled or moved-away lesson 410 join_closed, an ended one 410 lesson_ended.
 * A removed link is refused 403 removed_from_room.
 */
@Injectable()
export class GuestJoinService {
  constructor(
    private readonly queries: ClassroomRepo,
    private readonly limit: PublicJoinLimit,
    private readonly admission: RoomAdmission,
    @Inject(JoinLinkResolver) private readonly links: JoinLinkResolver,
  ) {}

  /** 404 link_invalid, 410 link_expired / join_closed / lesson_ended, 403 join_not_open_yet / removed_from_room, 429, 400, 503. */
  async join(input: { linkToken: string; ip: string; body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: input.ip, token: input.linkToken }, now.getTime());
    this.admission.livekit();
    const { name } = parseOrThrow(guestJoinSchema, input.body);
    const link = await this.links.resolve(input.linkToken, now);
    if (!link) throw notFound('link_invalid');
    if (link.revoked_at) throw new HttpException({ code: 'link_expired', message: 'link_expired' }, HttpStatus.GONE);
    const lesson = await this.queries.lesson(link.lesson_id);
    if (!lesson) throw notFound('link_invalid');
    assertLessonHeld(lesson);
    const win = await this.queries.joinWindow();
    assertWindowOpen(lesson, now, win);
    const closesS = Math.floor(Date.parse(joinWindow(lesson, now, win).closes_at) / MS) - Math.floor(now.getTime() / MS);
    const ttlSeconds = Math.min(closesS, ONE_DAY_S);
    return this.admission.admit({ lessonId: lesson.id, role: 'guest', name, principal: { joinLinkId: link.id }, ttlSeconds }, now);
  }
}
