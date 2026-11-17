import type { ViewToken } from 'react-native';
import { CHIP_MARGIN, type Separator } from '../../chat-ui/days/top-band';
import type { ChannelRow } from './list-rows';

type Tokens = readonly ViewToken<ChannelRow>[];

/**
 * The inline day chips among the rows on screen (chipCovered's separators): each chip's top is its
 * row's air and DayChip's margin down.
 */
export const chipSeparators = (tokens: Tokens): Separator[] =>
  tokens
    .filter((v) => v.item.opensDay)
    .map((v) => ({
      key: v.item.message.id,
      label: v.item.dayText,
      inset: v.item.space + CHIP_MARGIN,
    }));

/** The topmost row's day: the highest index of the inverted list; null with nothing on screen. */
export function topDay(tokens: Tokens): string | null {
  const top = tokens.reduce<ViewToken<ChannelRow> | null>(
    (best, v) => ((v.index ?? -1) > (best?.index ?? -1) ? v : best),
    null,
  );
  return top?.item.dayText ?? null;
}
