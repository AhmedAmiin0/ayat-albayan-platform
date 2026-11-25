import type { ShortLinkGateView, ShortLinkOpenResult } from '@ab/shared';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { SHORT_LINK_CODES, type ShortLinkCodes } from '@/common/http/short-link-codes';
import { LinkUsersRepo } from '@/modules/platform/short-links-admin/managed/link-users.repo';
import { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import {
  isLive,
  MANAGED_KIND,
  type ShortLinkRow,
  ShortLinks,
} from '@/modules/platform/short-links';
import { decide, outcomeOfRecord } from './gate.decision';
import { isListed, isReturning, visitKeyOf, type Visitor } from './gate.identity';

const missing = () => notFound('short_link_not_found');
const invalidCode = () =>
  new UnauthorizedException({ code: 'invalid_code', message: 'invalid_code' });
const bucket = (code: string): string => `short-link:${code}`;
type GoneReason = NonNullable<ShortLinkGateView['goneReason']>;
/** A gone link is revoked by an admin, else expired (by the cron or past its expiry). */
function goneReasonOf(row: ShortLinkRow, now: Date): GoneReason | null {
  if (isLive(row, now)) return null;
  return row.status === 'revoked' ? 'revoked' : 'expired';
}

interface PhoneCall {
  code: string;
  phone: string;
  ip: string;
}

/**
 * The web gate of a managed link (docs/19 «Gate»): a signed-in user opens by
 * profile; anyone else verifies a phone with a WhatsApp code (the family sign-in's codes and
 * limits, through SHORT_LINK_CODES). Then the decision table, and the visit is recorded atomically.
 * Unknown and system codes answer the same 404; the target leaves only with outcome open.
 */
@Injectable()
export class GateService {
  private readonly log = new Logger(GateService.name);

  constructor(
    @Inject(ShortLinks) private readonly links: ShortLinks,
    @Inject(LinkUsersRepo) private readonly users: LinkUsersRepo,
    @Inject(LinkPeopleRepo) private readonly people: LinkPeopleRepo,
    @Inject(SHORT_LINK_CODES) private readonly codes: ShortLinkCodes,
  ) {}

  async view(code: string, now = new Date()): Promise<ShortLinkGateView> {
    const row = await this.find(code);
    const goneReason = goneReasonOf(row, now);
    return {
      title: row.title,
      state: goneReason === null ? 'open' : 'gone',
      goneReason,
      needs: 'sign_in_or_code',
      codesAvailable: await this.codes.sendable(),
    };
  }

  async openAs(code: string, profileId: string): Promise<ShortLinkOpenResult> {
    const row = await this.find(code);
    const phone = (await this.people.phonesOf([profileId])).get(profileId) ?? null;
    return this.pass(row, { kind: 'profile', profileId, phone });
  }

  /** 202 whatever happens: a code goes out only while the link is live and the phone may open. */
  async start(call: PhoneCall): Promise<void> {
    await this.codes.limit('request', { ip: call.ip, identifier: bucket(call.code) });
    const row = await this.find(call.code);
    const visitor = await this.phoneVisitor(call.phone);
    const may = isLive(row, new Date()) && decide(await this.facts(row, visitor)) !== 'not_allowed';
    if (!may) return;
    const failed = (e: unknown) => this.log.warn(`short link code not sent: ${String(e)}`);
    void this.codes.issue({ code: row.code, phone: call.phone }).catch(failed);
  }

  /** 401 invalid_code for every failed check; else the decision for the verified phone. */
  async verify(call: PhoneCall & { otp: string }, now = new Date()): Promise<ShortLinkOpenResult> {
    await this.codes.limit('check', { ip: call.ip, identifier: bucket(call.code) });
    const row = await this.find(call.code);
    const ok = await this.codes.check({ code: row.code, phone: call.phone, otp: call.otp }, now);
    if (!ok) throw invalidCode();
    return this.pass(row, await this.phoneVisitor(call.phone));
  }

  private async pass(row: ShortLinkRow, visitor: Visitor): Promise<ShortLinkOpenResult> {
    const decided = decide(await this.facts(row, visitor));
    const outcome =
      decided === 'open'
        ? outcomeOfRecord(await this.users.recordVisit(row.code, visitKeyOf(visitor)))
        : decided;
    return outcome === 'open' ? { outcome, target: row.target_url } : { outcome };
  }

  private async facts(row: ShortLinkRow, visitor: Visitor) {
    const [users, visits] = await Promise.all([
      this.users.users(row.code),
      this.users.visits(row.code),
    ]);
    const listed = users.flatMap((u) => (u.profile_id ? [u.profile_id] : []));
    const listedPhones = await this.people.phonesOf(listed);
    return {
      live: isLive(row, new Date()),
      listed: row.audience === 'listed',
      inList: isListed(visitor, { users, listedPhones }),
      full: row.max_users !== null && visits.length >= row.max_users,
      returning: isReturning(visits, visitor),
    };
  }

  private async phoneVisitor(phone: string): Promise<Visitor> {
    return { kind: 'phone', phone, owner: await this.people.ownerOfPhone(phone) };
  }

  private async find(code: string): Promise<ShortLinkRow> {
    const row = await this.links.row(code);
    if (row?.kind !== MANAGED_KIND) throw missing();
    return row;
  }
}
