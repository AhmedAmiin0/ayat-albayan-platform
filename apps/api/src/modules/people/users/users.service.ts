import type {
  LinkCandidate,
  LinkKind,
  UserDetail,
  UserPage,
  UserRoleOption,
  UsersListQuery,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { StaffPhotos } from '@/common/storage/avatars/staff-photos';
import { UserAccess } from './users.access';
import { toUserDetail, toUserView } from './users.mapper';
import { assertMayList, canAssign, type Actor } from './users.rules';
import { USER_STORE, type UserRow, type UserStore } from './store/users.store';

export { actorOf, type Actor } from './users.rules';

/**
 * «المستخدمون»: the directory and the pickers. PATCH /users/:id, creation and the lifecycle live in
 * sibling services (update/, lifecycle/).
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly access: UserAccess,
    private readonly photos: StaffPhotos,
  ) {}

  /**
   * Each row with its photo (a staff login's own, else its teacher record's), signed in one call
   * for the page.
   */
  async list(query: UsersListQuery): Promise<UserPage> {
    const { rows, total } = await this.store.list(query);
    const photos = await this.photos.ofProfiles(rows.map((r) => r.id));
    const items = rows.map((r) => ({ ...toUserView(r), avatar_url: photos.get(r.id) ?? null }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<UserDetail> {
    return this.detail(await this.row(id));
  }

  /** The row with its signed photo. */
  async detail(row: UserRow): Promise<UserDetail> {
    const photos = await this.photos.ofProfiles([row.id]);
    return { ...toUserDetail(row), avatar_url: photos.get(row.id) ?? null };
  }

  /** 403 permission_not_held unless the actor holds that table's write permission (students.write…). */
  candidates(
    input: { kind: LinkKind; q?: string | undefined },
    actor: Actor,
  ): Promise<LinkCandidate[]> {
    assertMayList(actor, input.kind);
    return this.store.candidates(input.kind, input.q);
  }

  async roleOptions(actor: Actor): Promise<UserRoleOption[]> {
    const state = await this.access.state();
    return state.roles.map((r) => ({
      id: r.id,
      key: r.key,
      name_ar: r.name_ar,
      name_en: r.name_en,
      base_role: r.base_role,
      is_system: r.is_system,
      assignable: canAssign(actor, state, r),
    }));
  }

  /** 404 user_not_found. */
  async row(id: string): Promise<UserRow> {
    const row = await this.store.get(id);
    if (!row) throw notFound('user_not_found');
    return row;
  }
}
