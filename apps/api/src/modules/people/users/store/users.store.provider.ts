import type { Provider } from '@nestjs/common';
import { UserLinksRepo } from './user-links.repo';
import { UserProfilesRepo } from './user-profiles.repo';
import { UsersRepo } from './users.repo';
import { USER_STORE, type UserStore } from './users.store';

interface StoreParts {
  directory: UsersRepo;
  profiles: UserProfilesRepo;
  links: UserLinksRepo;
}

/** One UserStore over the three repositories; each method keeps its own repository as `this`. */
export function userStoreOf({ directory, profiles, links }: StoreParts): UserStore {
  return {
    list: (query) => directory.list(query),
    get: (id) => directory.get(id),
    references: (id) => directory.references(id),
    staff: () => profiles.staff(),
    profile: (id) => profiles.profile(id),
    upsertProfile: (row) => profiles.upsertProfile(row),
    updateProfile: (id, patch) => profiles.updateProfile(id, patch),
    setDisabled: (id, value) => profiles.setDisabled(id, value),
    forgetBrowsers: (id) => profiles.forgetBrowsers(id),
    phoneTaken: (phone, except) => links.phoneTaken(phone, except),
    linkTarget: (kind, id) => links.linkTarget(kind, id),
    link: (kind, id, profileId) => links.link(kind, id, profileId),
    createTeacher: (row) => links.createTeacher(row),
    syncTeacher: (profileId, patch) => links.syncTeacher(profileId, patch),
    candidates: (kind, q) => links.candidates(kind, q),
  };
}

/** USER_STORE (the same token the services inject) and the three repositories behind it. */
export const USER_STORE_PROVIDERS: Provider[] = [
  UsersRepo,
  UserProfilesRepo,
  UserLinksRepo,
  {
    provide: USER_STORE,
    inject: [UsersRepo, UserProfilesRepo, UserLinksRepo],
    useFactory: (directory: UsersRepo, profiles: UserProfilesRepo, links: UserLinksRepo) =>
      userStoreOf({ directory, profiles, links }),
  },
];
