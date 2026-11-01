import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { vi } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { PermissionCache } from '@/common/auth/permission.cache';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { FakeRoleStore } from '@/modules/people/roles/roles.fakes';
import { UserAccess } from './users.access';
import { UsersCreateService } from './lifecycle/users.create.service';
import { FakeAuthAdmin } from './auth/users.fakes.auth';
import { FakeUserStore, row, type Link } from './store/users.fakes.store';
import { UsersLifecycleService } from './lifecycle/users.lifecycle.service';
import { UserJournal } from './audit/users.journal';
import { UserLogins } from './auth/users.logins';
import { UserProfileWriter } from './update/users.profile-writer';
import { UsersUpdateService } from './update/users.update.service';
import type { Actor } from './users.rules';
import { UsersService } from './users.service';
import type { UserRow } from './store/users.store';

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
  const access = new UserAccess(roles, store);
  const journal = new UserJournal(cache, audit as unknown as AuditService);
  const logins = new UserLogins(auth, config);
  const photos = fakePhotos({ admin1: 'https://storage.test/admin1' });
  const users = new UsersService(store, access, photos.photos);
  const writer = new UserProfileWriter(store, auth);
  return {
    photoCalls: photos.calls,
    store,
    auth,
    roles,
    cache,
    audit,
    users,
    updater: new UsersUpdateService(access, users, writer, journal),
    creator: new UsersCreateService(store, access, logins, journal),
    lifecycle: new UsersLifecycleService(store, access, logins, journal),
  };
}

export { FakeAuthAdmin, FakeUserStore, row };
export type { Link };
