import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import type { GlassTabLook } from './GlassTab.types';

export function useGlassTab({ title, badge, focused }: GlassTabLook) {
  const { name, color } = useTheme();
  // An idle tab: ink-3 on the light capsule, ink-2 on the dark one.
  const idle = { light: color.ink3, dark: color.ink2 }[name];
  const tint = focused ? color.lapis : idle;
  const label = badge
    ? t.mobileNav.tabUnread.replace('{title}', title).replace('{n}', badge)
    : title;
  return { tint, label };
}
