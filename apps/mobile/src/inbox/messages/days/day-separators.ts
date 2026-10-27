import type { MessageView } from '@ab/shared';
import type { ViewToken } from 'react-native';
import { messageGap } from '../hooks/list-gap';
import { dayLabel, hasDayChip } from './day-label';
import { CHIP_MARGIN, type Separator } from './top-band';

/** The rows of the inverted list (newest first) and whether an older page exists. */
export interface Loaded {
  rows: readonly MessageView[];
  more: boolean;
}

/**
 * The day separators among the rows on screen, from the rows as they are now (a token whose index no
 * longer holds its message is skipped): each chip's top is its row's gap and DayChip's margin down.
 */
export function separatorsOf(
  { rows, more }: Loaded,
  tokens: readonly ViewToken<MessageView>[],
): Separator[] {
  return tokens.flatMap((v) => {
    const index = v.index ?? -1;
    if (index < 0 || rows[index]?.id !== v.item.id || !hasDayChip(rows, index, more)) return [];
    const inset = messageGap(rows[index + 1], v.item) + CHIP_MARGIN;
    return [{ key: v.item.id, label: dayLabel(v.item.created_at), inset }];
  });
}

/** The topmost row on screen (the highest index of the inverted list), if any. */
export function topmost(tokens: readonly ViewToken<MessageView>[]): MessageView | null {
  let top: ViewToken<MessageView> | null = null;
  for (const v of tokens) if ((v.index ?? -1) > (top?.index ?? -1)) top = v;
  return top?.item ?? null;
}
