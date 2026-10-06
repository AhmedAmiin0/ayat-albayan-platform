import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { vi } from 'vitest';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionCache } from '../../common/auth/permission.cache';
import { FakeRoleStore } from '../roles/roles.fakes';
import { UserAccess } from './users.access';
import { UsersCreateService } from './users.create.service';
import { FakeAuthAdmin } from './users.fakes.auth';
import { FakeUserStore, row, type Link } from './users.fakes.store';
import { UsersLifecycleService } from './users.lifecycle.service';
import { UserEffects, UserPorts } from './users.ports';
import type { Actor } from './users.rules';
import { UsersService } from './users.service';
import type { UserRow } from './users.store';

/** The system admin: every grantable permission. */
export const ADMIN_ACTOR: Actor = { id: 'admin1', permissions: [...GRANTABLE_PERMISSIONS] };

/** Everything wired with fakes. `rows` should include the acting admin (role admin, system role). */
export function setupUsers(rows: UserRow[] = [row('admin1', 'admin')], links: Link[] = []) {
  const store = new FakeUserStore(rows, links);
  const auth = new FakeAuthAdmin();
  const roles = new FakeRoleStore();
  const cache = new PermissionCache();
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = { passwordMinLength: 8, setPasswordUrl: 'https://app.example.test/set-password' };
  const ports = new UserPorts(store, auth, new UserAccess(roles, store));
  const effects = new UserEffects(cache, audit as unknown as AuditService, config);
  return {
    store,
    auth,
    roles,
    cache,
    audit,
    users: new UsersService(ports, effects),
    creator: new UsersCreateService(ports, effects),
    lifecycle: new UsersLifecycleService(ports, effects),
  };
}

export { FakeAuthAdmin, FakeUserStore, row };
export type { Link };
