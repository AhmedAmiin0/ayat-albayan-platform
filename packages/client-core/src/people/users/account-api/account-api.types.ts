import type { RouteBody, RouteResult } from '@ab/core';
import type { accountRoutes } from '@ab/shared';

type Routes = typeof accountRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Send<K extends keyof Routes> = (body: RouteBody<Routes[K]>) => Answer<K>;

export interface AccountCalls {
  profile: () => Answer<'profile'>;
  setLocale: Send<'locale'>;
  updateProfile: Send<'updateProfile'>;
  changeEmail: Send<'email'>;
  changePassword: Send<'password'>;
  avatarUploadUrl: Send<'avatarUploadUrl'>;
  setAvatar: Send<'setAvatar'>;
  removeAvatar: () => Answer<'removeAvatar'>;
}
