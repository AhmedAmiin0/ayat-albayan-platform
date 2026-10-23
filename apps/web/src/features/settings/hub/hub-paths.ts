/**
 * The hub's five destinations (docs/26b §1), in table order. «التواصل» moves to /admin/communications
 * in docs/23 phase 6; this path then becomes a redirect there.
 */
export const HUB_PATHS = {
  values: '/admin/settings/values',
  communications: '/admin/settings/communications',
  integrations: '/admin/settings/integrations',
  google: '/admin/settings/google',
  appearance: '/admin/settings/appearance',
} as const;

export type HubDestination = keyof typeof HUB_PATHS;

export const HUB_DESTINATIONS = Object.keys(HUB_PATHS) as HubDestination[];
