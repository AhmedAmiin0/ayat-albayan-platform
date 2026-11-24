/** docs/26b §1 table order; the docs/23 §2d /admin/communications alias opens communications. */
export const HUB_PATHS = {
  values: '/admin/settings/values',
  communications: '/admin/settings/communications',
  integrations: '/admin/settings/integrations',
  google: '/admin/settings/google',
  appearance: '/admin/settings/appearance',
} as const;

export type HubDestination = keyof typeof HUB_PATHS;

export const HUB_DESTINATIONS = Object.keys(HUB_PATHS) as HubDestination[];
