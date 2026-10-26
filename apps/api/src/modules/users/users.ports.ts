import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionCache } from '../../common/auth/permission.cache';
import { UserAccess } from './users.access';
import { AUTH_ADMIN, USER_STORE, USERS_CONFIG, type AuthAdmin, type UserStore, type UsersConfig } from './store/users.store';

/** What the users services read: the DB store, the Auth Admin API and the rule state loader. */
@Injectable()
export class UserPorts {
  constructor(
    @Inject(USER_STORE) readonly store: UserStore,
    @Inject(AUTH_ADMIN) readonly auth: AuthAdmin,
    readonly access: UserAccess,
  ) {}
}

/** What the users services do after a change: forget cached permissions, write the audit row. */
@Injectable()
export class UserEffects {
  constructor(
    readonly cache: PermissionCache,
    readonly audit: AuditService,
    @Inject(USERS_CONFIG) readonly config: UsersConfig,
  ) {}
}
