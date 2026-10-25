import { Inject, Injectable } from '@nestjs/common';
import { ROLE_STORE, type RoleStore } from '../roles/roles.store';
import { notFound } from '../../common/http/errors';
import type { UserState } from './users.logic';
import { USER_STORE, type StaffProfile, type UserStore } from './users.store';

/** Loads the role + profile state the rules of users.logic.ts judge. */
@Injectable()
export class UserAccess {
  constructor(
    @Inject(ROLE_STORE) private readonly roles: RoleStore,
    @Inject(USER_STORE) private readonly store: UserStore,
  ) {}

  async state(): Promise<UserState> {
    const [roles, profiles] = await Promise.all([this.roles.roles(), this.store.staff()]);
    return { roles, profiles };
  }

  /** The state plus the target profile (404 user_not_found). A student / guardian is not in state.profiles. */
  async target(id: string): Promise<{ state: UserState; target: StaffProfile }> {
    const [state, target] = await Promise.all([this.state(), this.store.profile(id)]);
    if (!target) throw notFound('user_not_found');
    return { state, target };
  }
}
