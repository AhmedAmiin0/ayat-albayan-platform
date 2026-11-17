import { shortLinkCreateSchema } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { AuthUser } from '@/common/auth/verify-token';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';
import type { LinkTargets } from './link-targets';
import type { LinkUsersSync } from './link-users-sync';
import type { ManagedLinksRepo } from './managed-links.repo';
import { ManagedLinks } from './managed-links.service';

const SALES: AuthUser = {
  id: '00000000-0000-4000-8000-0000000000b1',
  email: null,
  role: 'sales',
  permissions: ['short_links.manage'],
};

function setup() {
  const links = {
    insert: vi.fn(async (r: { code: string }) => managedRow({ code: r.code })),
    byCode: vi.fn(async () => managedRow()),
    update: vi.fn(async () => managedRow({ status: 'revoked' })),
  };
  const sync = { replace: vi.fn(async () => undefined) };
  const targets = {
    assertTarget: vi.fn(async () => undefined),
    expiry: vi.fn(async () => '2026-11-24T12:00:00.000Z'),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const svc = new ManagedLinks(
    links as unknown as ManagedLinksRepo,
    sync as unknown as LinkUsersSync,
    targets as unknown as LinkTargets,
    audit as unknown as AuditService,
  );
  return { svc, links, sync, targets, audit };
}

const body = shortLinkCreateSchema.parse({
  title: 'رابط التسجيل',
  targetUrl: 'https://app.example.com/register',
  phones: ['+201000000001'],
});

describe('managed links: create, edit, revoke (docs/19)', () => {
  it('create: a managed row (subject = code) by the caller, its users, an audit row', async () => {
    const { svc, links, sync, audit } = setup();
    const row = await svc.create(body, SALES);
    const inserted = links.insert.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      kind: 'managed',
      created_by: SALES.id,
      status: 'active',
      subject: inserted?.code,
    });
    expect(sync.replace).toHaveBeenCalledWith(
      row.code,
      expect.objectContaining({ phones: ['+201000000001'] }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'short_links', action: 'short_link_create' }),
    );
  });

  it('create refuses a target outside the allow-list before writing anything', async () => {
    const { svc, links, targets } = setup();
    targets.assertTarget.mockRejectedValueOnce(new Error('target_not_allowed'));
    await expect(svc.create(body, SALES)).rejects.toThrow('target_not_allowed');
    expect(links.insert).not.toHaveBeenCalled();
  });

  it("a sales user cannot edit or revoke another's link (404)", async () => {
    const { svc, links } = setup();
    links.byCode.mockResolvedValue(
      managedRow({ created_by: '00000000-0000-4000-8000-0000000000b2' }),
    );
    await expect(svc.revoke('Mg12Cd34Ef', SALES)).rejects.toThrow(/short_link_not_found/);
    await expect(svc.update('Mg12Cd34Ef', { title: 'x' }, SALES)).rejects.toThrow(
      /short_link_not_found/,
    );
  });

  it('revoke is audited once and idempotent; a revoked link takes no edit', async () => {
    const { svc, links, audit } = setup();
    await svc.revoke('Mg12Cd34Ef', SALES);
    links.byCode.mockResolvedValue(managedRow({ status: 'revoked' }));
    await svc.revoke('Mg12Cd34Ef', SALES);
    expect(audit.record).toHaveBeenCalledTimes(1);
    await expect(svc.update('Mg12Cd34Ef', { title: 'x' }, SALES)).rejects.toThrow(
      /short_link_revoked/,
    );
  });

  it('edit: a new expiry reactivates; an edit without a user list keeps the list', async () => {
    const { svc, links, sync } = setup();
    await svc.update('Mg12Cd34Ef', { expiresAt: '2026-11-30T00:00:00Z' }, SALES);
    expect(links.update).toHaveBeenCalledWith('Mg12Cd34Ef', {
      expires_at: '2026-11-24T12:00:00.000Z',
      status: 'active',
    });
    expect(sync.replace).not.toHaveBeenCalled();
  });
});
