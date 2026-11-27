import { accountRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { AccountCalls } from './account-api.types';

/** The signed-in caller's own login on one api client; answers parsed strictly. */
export function accountCalls(client: ApiClient): AccountCalls {
  const call = callWith(client);
  return {
    profile: () => call({ route: routes.profile }),
    setLocale: (body) => call({ route: routes.locale, body }),
    updateProfile: (body) => call({ route: routes.updateProfile, body }),
    changeEmail: (body) => call({ route: routes.email, body }),
    changePassword: (body) => call({ route: routes.password, body }),
    avatarUploadUrl: (body) => call({ route: routes.avatarUploadUrl, body }),
    setAvatar: (body) => call({ route: routes.setAvatar, body }),
    removeAvatar: () => call({ route: routes.removeAvatar }),
  };
}
