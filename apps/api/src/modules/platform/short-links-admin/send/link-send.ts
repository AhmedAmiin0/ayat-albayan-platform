import { SHORT_LINK_TEMPLATE } from '@ab/shared';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Outbox } from '@/modules/messaging/inbox';
import { TemplateRegistry } from '@/modules/messaging/whatsapp';
import { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import type { ShortLinkRow } from '@/modules/platform/short-links';
import {
  LinkUsersRepo,
  type LinkUserRow,
} from '@/modules/platform/short-links-admin/managed/link-users.repo';

interface LinkToSend {
  row: ShortLinkRow;
  shortUrl: string;
  actorId: string;
}

/** What one listed user's send did (the counts the route answers). */
export interface SendSummary {
  queued: number;
  failed: number;
}

/** The first reason a row cannot be queued, in order; null = it can. */
const REASONS: readonly [string, (c: { approved: boolean; phone: string | null }) => boolean][] = [
  ['template_not_approved', (c) => !c.approved],
  ['no_phone', (c) => c.phone === null],
];
export const sendFailure = (c: { approved: boolean; phone: string | null }): string | null =>
  REASONS.find(([, bad]) => bad(c))?.[0] ?? null;

/** One key per link, user row and attempt: a retried request never queues twice (rule 8). */
export const sendDedupKey = (code: string, user: LinkUserRow): string =>
  `${SHORT_LINK_TEMPLATE}:${code}:${user.id}:${user.send_attempts + 1}`;

/**
 * The WhatsApp send of a managed link (docs/19): ALWAYS the template short_link,
 * whose registry row sits on the NOTIFICATIONS line, through the usual Outbox and sender gates.
 * Until the template is approved every row is recorded failed (template_not_approved): never free
 * text, never another line. {{1}} the title, {{2}} the short URL, the button the code.
 */
@Injectable()
export class LinkSend {
  private readonly log = new Logger(LinkSend.name);

  constructor(
    @Inject(TemplateRegistry) private readonly templates: TemplateRegistry,
    @Inject(Outbox) private readonly outbox: Outbox,
    @Inject(LinkUsersRepo) private readonly users: LinkUsersRepo,
    @Inject(LinkPeopleRepo) private readonly people: LinkPeopleRepo,
  ) {}

  async sendAll(link: LinkToSend, now = new Date()): Promise<SendSummary> {
    const rows = await this.users.users(link.row.code);
    const approved = (await this.templates.approved(SHORT_LINK_TEMPLATE)) !== null;
    const listed = rows.flatMap((r) =>
      r.phone_e164 === null && r.profile_id ? [r.profile_id] : [],
    );
    const phones = await this.people.phonesOf(listed);
    const outcomes: boolean[] = [];
    for (const user of rows) {
      const phone = user.phone_e164 ?? phones.get(user.profile_id ?? '') ?? null;
      outcomes.push(await this.one({ link, user, approved, phone, now }));
    }
    return { queued: outcomes.filter(Boolean).length, failed: outcomes.filter((ok) => !ok).length };
  }

  /** true = queued. Never throws: one user's failure never stops the others. */
  private async one(s: {
    link: LinkToSend;
    user: LinkUserRow;
    approved: boolean;
    phone: string | null;
    now: Date;
  }): Promise<boolean> {
    const reason = sendFailure(s);
    const attempts = s.user.send_attempts + 1;
    if (reason !== null || s.phone === null) return this.failed(s.user, reason ?? 'no_phone');
    try {
      await this.outbox.queue(this.message({ ...s, phone: s.phone }));
      const sent = { send_status: 'queued', send_error: null, sent_at: s.now.toISOString() };
      await this.users.mark(s.user.id, { ...sent, send_attempts: attempts });
      return true;
    } catch (e) {
      this.log.warn(`short link send failed: ${e instanceof Error ? e.message : String(e)}`);
      return this.failed(s.user, 'send_failed');
    }
  }

  private message(s: { link: LinkToSend; user: LinkUserRow; phone: string }) {
    const { row, shortUrl, actorId } = s.link;
    return {
      phone_e164: s.phone,
      template_key: SHORT_LINK_TEMPLATE,
      template_params: { '1': row.title ?? '', '2': shortUrl, button: row.code },
      dedup_key: sendDedupKey(row.code, s.user),
      created_by: actorId,
      expires_at: row.expires_at,
    };
  }

  private async failed(user: LinkUserRow, reason: string): Promise<false> {
    const patch = {
      send_status: 'failed',
      send_error: reason,
      send_attempts: user.send_attempts + 1,
    };
    await this.users.mark(user.id, patch);
    return false;
  }
}
