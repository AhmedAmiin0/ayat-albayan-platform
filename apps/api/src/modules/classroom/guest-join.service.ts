import { guestJoinSchema, joinWindow, lessonRoomName, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { ClassroomQueries } from './classroom.queries';
import { assertWindowOpen, notConfigured } from './join-gate';
import { PublicJoinLimit } from './join-limit';
import { checkLink, hashLinkToken, looksLikeLinkToken } from './join-link.token';
import { mintToken, newIdentity } from './livekit-token';

const MS = 1000;
const ONE_DAY_S = 86_400;

/**
 * POST /public/join/:linkToken (no login): the token in the path is the whole credential. A fresh
 * identity per call, so the same link opened by two people (or two windows) never kicks anyone.
 * The token's lifetime ends where the classroom closes.
 */
@Injectable()
export class GuestJoinService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly limit: PublicJoinLimit,
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
  ) {}

  /** 404 link_invalid, 410 link_expired / join_closed, 403 join_not_open_yet, 429, 400 validation, 503. */
  async join(input: { linkToken: string; ip: string; body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: input.ip, token: input.linkToken }, now.getTime());
    if (!this.config) throw notConfigured();
    const { name } = parseOrThrow(guestJoinSchema, input.body);
    if (!looksLikeLinkToken(input.linkToken)) throw notFound('link_invalid');
    const link = await this.queries.linkByHash(hashLinkToken(input.linkToken));
    if (!link) throw notFound('link_invalid');
    if (checkLink(link, now) !== 'ok') throw new HttpException({ code: 'link_expired', message: 'link_expired' }, HttpStatus.GONE);
    const lesson = await this.queries.lesson(link.lesson_id);
    if (!lesson) throw notFound('link_invalid');
    assertWindowOpen(lesson, now);
    const closesS = Math.floor(Date.parse(joinWindow(lesson, now).closes_at) / MS) - Math.floor(now.getTime() / MS);
    const room = lessonRoomName(lesson.id);
    const ttlSeconds = Math.min(closesS, ONE_DAY_S);
    const token = mintToken(this.config, { room, role: 'guest', name, identity: newIdentity('guest'), ttlSeconds }, now);
    return { url: this.config.url, token, room, role: 'guest' };
  }
}
