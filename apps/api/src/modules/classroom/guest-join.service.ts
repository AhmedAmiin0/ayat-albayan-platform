import { guestJoinSchema, joinWindow, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { notFound } from '../../common/http/errors';
import { parseOrThrow } from '../../common/http/http';
import { ClassroomQueries } from './classroom.queries';
import { assertWindowOpen } from './join-gate';
import { PublicJoinLimit } from './join-limit';
import { checkLink, hashLinkToken, looksLikeLinkToken } from './join-link.token';
import { RoomAdmission } from './room-admission';

const MS = 1000;
const ONE_DAY_S = 86_400;

/**
 * POST /public/join/:linkToken (no login): the token in the path is the whole credential. A fresh
 * identity per call, so the same link opened by two people (or two windows) never kicks anyone.
 * The token's lifetime ends where the classroom closes. A removed link is refused 403 removed_from_room.
 */
@Injectable()
export class GuestJoinService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly limit: PublicJoinLimit,
    private readonly admission: RoomAdmission,
  ) {}

  /** 404 link_invalid, 410 link_expired / join_closed, 403 join_not_open_yet / removed_from_room, 429, 400, 503. */
  async join(input: { linkToken: string; ip: string; body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: input.ip, token: input.linkToken }, now.getTime());
    this.admission.livekit();
    const { name } = parseOrThrow(guestJoinSchema, input.body);
    if (!looksLikeLinkToken(input.linkToken)) throw notFound('link_invalid');
    const link = await this.queries.linkByHash(hashLinkToken(input.linkToken));
    if (!link) throw notFound('link_invalid');
    if (checkLink(link, now) !== 'ok') throw new HttpException({ code: 'link_expired', message: 'link_expired' }, HttpStatus.GONE);
    const lesson = await this.queries.lesson(link.lesson_id);
    if (!lesson) throw notFound('link_invalid');
    const win = await this.queries.joinWindow();
    assertWindowOpen(lesson, now, win);
    const closesS = Math.floor(Date.parse(joinWindow(lesson, now, win).closes_at) / MS) - Math.floor(now.getTime() / MS);
    const ttlSeconds = Math.min(closesS, ONE_DAY_S);
    return this.admission.admit({ lessonId: lesson.id, role: 'guest', name, principal: { joinLinkId: link.id }, ttlSeconds }, now);
  }
}
