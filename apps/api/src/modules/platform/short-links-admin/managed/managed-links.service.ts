import type { ShortLinkCreate, ShortLinkUpdate } from '@ab/shared';
import { Injectable, Inject } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { MANAGED_KIND, newShortCode, type ShortLinkRow } from '@/modules/platform/short-links';
import { LinkTargets } from './link-targets';
import { LinkUsersSync } from './link-users-sync';
import { managedOrThrow } from './managed.access';
import { ManagedLinksRepo } from './managed-links.repo';

const CODE_TRIES = 3;
type Draft = Omit<ShortLinkRow, 'id' | 'code' | 'subject' | 'created_at'>;

/** A revoked link takes no edit (409 short_link_revoked); an expired one may be extended. */
const assertNotRevoked = (row: ShortLinkRow): void => {
  if (row.status === 'revoked') throw conflict('short_link_revoked');
};

/** The row's changes of an edit; a new expiry makes an expired link active again. */
const patchOf = (body: ShortLinkUpdate, expires: string | null) => ({
  ...(body.title === undefined ? {} : { title: body.title }),
  ...(body.maxUsers === undefined ? {} : { max_users: body.maxUsers }),
  ...(expires === null ? {} : { expires_at: expires, status: 'active' }),
});

/** The new user list when the edit gives one (either array), else null (the list stays). */
const listOf = (body: ShortLinkUpdate): { profileIds: string[]; phones: string[] } | null =>
  body.profileIds === undefined && body.phones === undefined
    ? null
    : { profileIds: body.profileIds ?? [], phones: body.phones ?? [] };

/**
 * Create, edit and revoke a managed link (docs/19). The target is checked
 * against the allow-list (+ the extra hosts) at write time; only the server ever writes it. Every
 * create and revoke leaves an audit row (entity short_links).
 */
@Injectable()
export class ManagedLinks {
  constructor(
    @Inject(ManagedLinksRepo) private readonly links: ManagedLinksRepo,
    @Inject(LinkUsersSync) private readonly sync: LinkUsersSync,
    @Inject(LinkTargets) private readonly targets: LinkTargets,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(body: ShortLinkCreate, user: AuthUser, now = new Date()): Promise<ShortLinkRow> {
    await this.targets.assertTarget(body.targetUrl);
    const draft: Draft = {
      kind: MANAGED_KIND,
      target_url: body.targetUrl,
      expires_at: await this.targets.expiry(body.expiresAt, now),
      created_by: user.id,
      title: body.title,
      max_users: body.maxUsers,
      audience: body.audience,
      send_whatsapp: body.sendWhatsapp,
      status: 'active',
    };
    const row = await this.insert(draft, CODE_TRIES);
    await this.sync.replace(row.code, { ...body, actorId: user.id });
    await this.record({ user, row, action: 'short_link_create' });
    return row;
  }

  async update(code: string, body: ShortLinkUpdate, user: AuthUser): Promise<ShortLinkRow> {
    const row = managedOrThrow(user, await this.links.byCode(code));
    assertNotRevoked(row);
    const expires = await this.newExpiry(body.expiresAt);
    const patch = patchOf(body, expires);
    const users = listOf(body);
    if (users) await this.sync.replace(code, { ...users, actorId: user.id });
    return Object.keys(patch).length > 0 ? this.links.update(code, patch) : row;
  }

  /** Stops the link at once (idempotent: a revoked link answers as it is). */
  async revoke(code: string, user: AuthUser): Promise<ShortLinkRow> {
    const row = managedOrThrow(user, await this.links.byCode(code));
    if (row.status === 'revoked') return row;
    const done = await this.links.update(code, { status: 'revoked' });
    await this.record({ user, row, action: 'short_link_revoke' });
    return done;
  }

  /** An audit row (entity short_links, the link's id; the code in `after`). */
  record(e: { user: AuthUser; row: ShortLinkRow; action: string }): Promise<void> {
    const { user, row, action } = e;
    const after = { code: row.code, title: row.title };
    return this.audit.record({
      actorId: user.id,
      entity: 'short_links',
      entityId: row.id,
      action,
      after,
    });
  }

  private async newExpiry(given: string | undefined): Promise<string | null> {
    return given === undefined ? null : this.targets.expiry(given, new Date());
  }

  private async insert(draft: Draft, tries: number): Promise<ShortLinkRow> {
    const code = newShortCode();
    const row = await this.links.insert({ ...draft, code, subject: code });
    if (row) return row;
    if (tries <= 1) throw new Error('short link: could not store a code');
    return this.insert(draft, tries - 1);
  }
}
