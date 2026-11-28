import type { BubbleShellProps } from './BubbleShell.types';
import { useBubbleBox } from './use-bubble-box';

export function useBubbleShell(p: BubbleShellProps) {
  const box = useBubbleBox(p);
  const spoken = p.accessibilityActions !== undefined;
  return { box, spoken };
}
