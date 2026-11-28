import { useRef } from 'react';
import type { Text } from 'react-native';
import { useA11yPref } from '../../primitives/use-a11y-pref';
import { SHEET_PADDING, snapPointsOf } from './sheet-frame';
import type { SheetProps } from './Sheet.types';
import { useSheetFocus } from '../use-sheet-focus';

export function useSheet({ open, size = 'fit', returnFocus }: SheetProps) {
  const title = useRef<Text>(null);
  const still = useA11yPref('reduceMotion');
  useSheetFocus(open, title, returnFocus);
  return { title, padding: SHEET_PADDING, snapPoints: snapPointsOf(size, still) };
}
