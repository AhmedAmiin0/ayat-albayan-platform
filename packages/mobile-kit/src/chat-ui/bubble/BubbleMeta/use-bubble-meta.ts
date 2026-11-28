import { useState } from 'react';
import { useSmallText } from '../use-small-text';
import type { BubbleMetaProps } from './BubbleMeta.types';

export function useBubbleMeta({ ticks, ink }: Pick<BubbleMetaProps, 'ticks' | 'ink'>) {
  const small = useSmallText(ink);
  const [open, setOpen] = useState(false);
  const times = ticks?.times ?? '';
  const toggle = () => setOpen((v) => !v);
  return { small, open, toggle, times };
}
