import type {
  ShortLinkCreate,
  ShortLinkDetail,
  ShortLinkListQuery,
  ShortLinkPage,
  ShortLinkPerson,
  ShortLinkSentDetail,
  ShortLinkUpdate,
} from '@ab/shared';
import { Injectable, Inject } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import type { ShortLinkRow } from '@/modules/platform/short-links';
import { LinkSend, type SendSummary } from '@/modules/platform/short-links-admin/send/link-send';
import { LinkTargets } from './link-targets';
import { managedOrThrow } from './managed.access';
import { ManagedLinks } from './managed-links.service';
import { ManagedReads } from './managed-reads';

/** docs/19: an audit row per resend. */
@Injectable()
export class ShortLinksAdmin {
  constructor(
    @Inject(ManagedLinks) private readonly writes: ManagedLinks,
    @Inject(ManagedReads) private readonly reads: ManagedReads,
    @Inject(LinkSend) private readonly sender: LinkSend,
    @Inject(LinkTargets) private readonly targets: LinkTargets,
  ) {}

  async create(body: ShortLinkCreate, user: AuthUser): Promise<ShortLinkSentDetail> {
    const row = await this.writes.create(body, user);
    const send = row.send_whatsapp ? await this.sendNow(row, user) : null;
    return { ...(await this.reads.view(row)), send };
  }

  async update(code: string, body: ShortLinkUpdate, user: AuthUser): Promise<ShortLinkDetail> {
    return this.reads.view(await this.writes.update(code, body, user));
  }

  async revoke(code: string, user: AuthUser): Promise<ShortLinkDetail> {
    return this.reads.view(await this.writes.revoke(code, user));
  }

  /** 409 short_link_not_active for an expired or revoked link (nothing to open). */
  async resend(code: string, user: AuthUser): Promise<ShortLinkSentDetail> {
    const row = managedOrThrow(user, await this.reads.row(code));
    if (row.status !== 'active') throw conflict('short_link_not_active');
    const send = await this.sendNow(row, user);
    await this.writes.record({ user, row, action: 'short_link_resend' });
    return { ...(await this.reads.view(row)), send };
  }

  list(query: ShortLinkListQuery, user: AuthUser): Promise<ShortLinkPage> {
    return this.reads.list(query, user);
  }

  detail(code: string, user: AuthUser): Promise<ShortLinkDetail> {
    return this.reads.detail(code, user);
  }

  people(search: string): Promise<ShortLinkPerson[]> {
    return this.reads.search(search);
  }

  private async sendNow(row: ShortLinkRow, user: AuthUser): Promise<SendSummary> {
    const shortUrl = `${await this.targets.base()}${row.code}`;
    return this.sender.sendAll({ row, shortUrl, actorId: user.id });
  }
}
