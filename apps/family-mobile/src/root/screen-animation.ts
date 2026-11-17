import { I18nManager } from 'react-native';

type StackAnimation = 'slide_from_right' | 'slide_from_left';

/**
 * A pushed screen slides in from the reading end (docs/50 §6: smooth transitions). Android's
 * names are physical (slide_from_right ignores RTL), so Arabic needs the left one; iOS resolves
 * both to its own push, which follows the layout direction.
 */
const BY_DIRECTION: Readonly<Record<'rtl' | 'ltr', StackAnimation>> = {
  rtl: 'slide_from_left',
  ltr: 'slide_from_right',
};

/** The stack's slide for this run's direction (the native flag, set before the JS starts). */
export const screenAnimation = (rtl: boolean = I18nManager.isRTL): StackAnimation =>
  BY_DIRECTION[rtl ? 'rtl' : 'ltr'];
