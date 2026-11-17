import type {
  ShortLinkDetail,
  ShortLinkListQuery,
  ShortLinkPage,
  ShortLinkPerson,
} from '@ab/shared';
import { Injectable, Inject } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import type { ShortLinkRow } from '@/modules/platform/short-links';
import { LinkTargets } from './link-targets';
import { LinkUsersRepo } from './link-users.repo';
import { managedOrThrow, ownerScope } from './managed.access';
import { toLinkView, toUserView, toVisitorView, type People } from './managed.mapper';
import { ManagedLinksRepo } from './managed-links.repo';

const ids = (values: (string | null)[]): string[] => [
  ...new Set(values.filter((v): v is string => v !== null)),
];

/**
 * The admin / sales reads (docs/19): the list (own links only without short_links.all), one link
 * with its users and visitors (system users by name and role, verified phones with the person and
 * family they matched), and the picker's people search.
 */
@Injectable()
export class ManagedReads {
  constructor(
    @Inject(ManagedLinksRepo) private readonly links: ManagedLinksRepo,
    @Inject(LinkUsersRepo) private readonly users: LinkUsersRepo,
    @Inject(LinkPeopleRepo) private readonly people: LinkPeopleRepo,
    @Inject(LinkTargets) private readonly targets: LinkTargets,
  ) {}

  async list(query: ShortLinkListQuery, user: AuthUser): Promise<ShortLinkPage> {
    const { rows, total } = await this.links.page({ query, owner: ownerScope(user) });
    const [counts, people, base] = await Promise.all([
      this.users.counts(rows.map((r) => r.code)),
      this.peopleOf(rows.map((r) => r.created_by)),
      this.targets.base(),
    ]);
    const countOf = (code: string) => ({
      users: counts.users.get(code) ?? 0,
      visitors: counts.visitors.get(code) ?? 0,
    });
    return {
      rows: rows.map((row) => toLinkView({ row, base, people, counts: countOf(row.code) })),
      total,
    };
  }

  row(code: string): Promise<ShortLinkRow | null> {
    return this.links.byCode(code);
  }

  async detail(code: string, user: AuthUser): Promise<ShortLinkDetail> {
    const row = managedOrThrow(user, await this.links.byCode(code));
    return this.view(row);
  }

  /** The detail of a row the caller already holds (after a create or an edit). */
  async view(row: ShortLinkRow): Promise<ShortLinkDetail> {
    const [userRows, visits, base] = await Promise.all([
      this.users.users(row.code),
      this.users.visits(row.code),
      this.targets.base(),
    ]);
    const people = await this.peopleOf([
      row.created_by,
      ...userRows.map((u) => u.profile_id),
      ...visits.flatMap((v) => [v.profile_id, v.matched_profile_id]),
    ]);
    const families = await this.people.familyNames(ids(visits.map((v) => v.matched_guardian_id)));
    const counts = { users: userRows.length, visitors: visits.length };
    return {
      ...toLinkView({ row, base, people, counts }),
      userList: userRows.map((u) => toUserView(u, people)),
      visitorList: visits.map((v) => toVisitorView(v, { people, families })),
    };
  }

  async search(text: string): Promise<ShortLinkPerson[]> {
    const rows = await this.people.search(text);
    return rows.map((p) => ({ id: p.id, name: p.full_name, role: p.role, phone: p.phone_e164 }));
  }

  private async peopleOf(values: (string | null)[]): Promise<People> {
    const rows = await this.people.byIds(ids(values));
    return new Map(rows.map((p) => [p.id, p]));
  }
}
