import { accountRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { AccountCalls } from './account-api.types';

/** The signed-in caller's own login on one api client; answers parsed strictly. */
export function accountCalls(client: ApiClient): AccountCalls {
  const call = callWith(client);
  return {
    profile: () => call({ route: accountRoutes.profile }),
    setLocale: (body) => call({ route: accountRoutes.locale, body }),
    updateProfile: (body) => call({ route: accountRoutes.updateProfile, body }),
    changeEmail: (body) => call({ route: accountRoutes.email, body }),
    changePassword: (body) => call({ route: accountRoutes.password, body }),
    avatarUploadUrl: (body) => call({ route: accountRoutes.avatarUploadUrl, body }),
    setAvatar: (body) => call({ route: accountRoutes.setAvatar, body }),
    removeAvatar: () => call({ route: accountRoutes.removeAvatar }),
  };
}
