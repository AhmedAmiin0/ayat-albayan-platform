import type { SnapPoint } from '@expo/ui';
import { space } from '../../../theme';
import type { SheetSize } from './Sheet.types';

/** The native sheet keeps its content above the home indicator and Android's navigation bar. */
export const SHEET_PADDING = { top: space[2], bottom: space[6], left: space[4], right: space[4] };

const LARGE: SnapPoint[] = ['half', 'full'];
const LARGE_STILL: SnapPoint[] = ['full'];

/** No snap points lets the native sheet fit its content; Reduce Motion skips the half step. */
export function snapPointsOf(size: SheetSize, still: boolean): SnapPoint[] | undefined {
  if (size === 'fit') return undefined;
  return still ? LARGE_STILL : LARGE;
}
