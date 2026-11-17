import { Injectable, Inject } from '@nestjs/common';
import { badRequest } from '@/common/http/errors';
import { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import { LinkUsersRepo } from './link-users.repo';
import { diffUsers, type WantedUsers } from './managed.rules';

/**
 * The link ↔ user list (many-to-many, docs/19): the given list replaces the stored one; rows that
 * stay keep their send state. 400 unknown_user for a profile id that is not a profile.
 */
@Injectable()
export class LinkUsersSync {
  constructor(
    @Inject(LinkUsersRepo) private readonly users: LinkUsersRepo,
    @Inject(LinkPeopleRepo) private readonly people: LinkPeopleRepo,
  ) {}

  async replace(code: string, wanted: WantedUsers & { actorId: string }): Promise<void> {
    const known = await this.people.byIds([...new Set(wanted.profileIds)]);
    if (known.length !== new Set(wanted.profileIds).size) throw badRequest('unknown_user');
    const diff = diffUsers(await this.users.users(code), wanted);
    const added_by = wanted.actorId;
    await this.users.remove(diff.removeIds);
    await this.users.add([
      ...diff.addProfiles.map((profile_id) => ({ code, profile_id, added_by })),
      ...diff.addPhones.map((phone_e164) => ({ code, phone_e164, added_by })),
    ]);
  }
}
