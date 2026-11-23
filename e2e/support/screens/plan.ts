import type { Variant } from './screens.types.ts';

const H = 900;

export const LIGHT_1440: Variant = { name: '1440-light', width: 1440, height: H, theme: 'light' };
export const PHONE: Variant = { name: '390-light', width: 390, height: 844, theme: 'light' };
export const EMPTY: Variant = { name: 'empty', width: 1440, height: H, theme: 'light' };
export const ENGLISH: Variant = { name: '390-en', width: 390, height: 844, theme: 'light' };

/** Every signed-in page in these four; the first one also probes which role reaches the page. */
export const VARIANTS: readonly Variant[] = [
  LIGHT_1440,
  { name: '1440-dark', width: 1440, height: H, theme: 'dark' },
  { name: '768-light', width: 768, height: 1024, theme: 'light' },
  PHONE,
];

/** Dialogs and sheets open on the desktop and the phone layouts only. */
export const DIALOG_VARIANTS: readonly Variant[] = [LIGHT_1440, PHONE];
export const MAX_DIALOGS = 3;

const STAFF_PUBLIC =
  /^\/(login|set-password|account-setup|feedback|join|l|m|pay|report|s|teacher-report)(\/|$)/;
const FAMILY_PUBLIC = /^\/(login|privacy|delete-account)$/;

/** Pages anyone opens signed out: shot once, as «public». */
export const isStaffPublic = (route: string): boolean => STAFF_PUBLIC.test(route);
export const isFamilyPublic = (route: string): boolean => FAMILY_PUBLIC.test(route);

export const hasParams = (route: string): boolean => route.includes('$');

export const OUT_DIR = new URL('../../ui-screens/', import.meta.url).pathname;
