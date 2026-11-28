import { useAppearancePref } from '../../../lib/appearance/useAppearancePref';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import type { AppearanceChoice } from './AppearancePicker.types';

/** The choice is saved on the device and applied at once. */
export function useAppearancePicker(): AppearanceChoice {
  const { color } = useTheme();
  const [pref, choose] = useAppearancePref();
  return {
    pref,
    choose,
    items: [
      { value: 'auto', label: t.theme.auto },
      { value: 'light', label: t.theme.light },
      { value: 'dark', label: t.theme.dark },
    ],
    label: t.theme.label,
    colors: {
      activeContainerColor: color.lapisWash,
      activeContentColor: color.lapis,
      activeBorderColor: color.rule,
      inactiveContainerColor: color.raised,
      inactiveContentColor: color.ink,
      inactiveBorderColor: color.rule,
    },
    labelStyle: { fontFamily: type.ui[600], fontSize: type.size.sm },
  };
}
