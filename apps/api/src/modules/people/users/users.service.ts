import {
  linkedRecordSchema,
  userRoleOptionSchema,
  type LinkCandidate,
  type LinkKind,
  type UserDetail,
  type UserPage,
  type UserRoleOption,
  type UsersListQuery,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { notFound } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';
import { StaffPhotos } from '@/common/storage/avatars/staff-photos';
import { UserAccess } from './users.access';
import { toUserDetail, toUserView } from './users.mapper';
import { assertMayList, canAssign, type Actor } from './users.rules';
import { USER_STORE, type UserRow, type UserStore } from './store/users.store';

export { actorOf, type Actor } from './users.rules';

/** PATCH, creation and lifecycle live in sibling services. */
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
    const items = rows.map((r) => toUserView(r, photos.get(r.id) ?? null));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<UserDetail> {
    return this.detail(await this.row(id));
  }

  /** The row with its signed photo. */
  async detail(row: UserRow): Promise<UserDetail> {
    const photos = await this.photos.ofProfiles([row.id]);
    return toUserDetail(row, photos.get(row.id) ?? null);
  }

  /** 403 permission_not_held unless the actor holds that table's write permission (students.write…). */
  async candidates(
    input: { kind: LinkKind; q?: string | undefined },
    actor: Actor,
  ): Promise<LinkCandidate[]> {
    assertMayList(actor, input.kind);
    const found = await this.store.candidates(input.kind, input.q);
    return asResponse(z.array(linkedRecordSchema), found);
  }

  async roleOptions(actor: Actor): Promise<UserRoleOption[]> {
    const state = await this.access.state();
    const options = state.roles.map((r) => ({
      id: r.id,
      key: r.key,
      name_ar: r.name_ar,
      name_en: r.name_en,
      base_role: r.base_role,
      is_system: r.is_system,
      assignable: canAssign(actor, state, r),
    }));
    return asResponse(z.array(userRoleOptionSchema), options);
  }

  /** 404 user_not_found. */
  async row(id: string): Promise<UserRow> {
    const row = await this.store.get(id);
    if (!row) throw notFound('user_not_found');
    return row;
  }
}
