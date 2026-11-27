import { I18nManager, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../theme';
import { BAR_HEIGHT, BAR_SIDE, barBottom } from '../../layout/tab-bar-inset';
import { useA11yPref } from '../../primitives/use-a11y-pref';
import { usePillOffset } from '../use-pill-offset';
import { useReportBarHeight } from '../use-report-bar-height';
import type { GlassTabBarProps } from './GlassTabBar.types';

export function useGlassTabBar({ state, insets }: Pick<GlassTabBarProps, 'state' | 'insets'>) {
  const { color, glass } = useTheme();
  const width = useWindowDimensions().width;
  const opaque = useA11yPref('reduceTransparency');
  const reduceMotion = useA11yPref('reduceMotion');
  const bottom = barBottom(insets.bottom);
  const tabWidth = (width - 2 * BAR_SIDE - 8) / state.routes.length;
  const x = usePillOffset({ index: state.index, tabWidth, rtl: I18nManager.isRTL, reduceMotion });
  useReportBarHeight(bottom + BAR_HEIGHT);
  const sheen = glass.sheen;
  return { color, glass, opaque, bottom, tabWidth, x, sheen };
}
