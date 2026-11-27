import { useCheckPop } from '../use-check-pop';
import type { CheckBadgeProps } from './CheckBadge.types';
import { TRAVEL } from './check-badge.helpers';

export function useCheckBadge({ still }: CheckBadgeProps) {
  return useCheckPop(still, TRAVEL);
}
