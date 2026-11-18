import type { LinkTone } from '@ab/client-core';
import { StatusChip } from '@ab/mobile-kit';
import { TONE_STYLE } from './link-words';

/** A link's state («فعّال», «اكتمل العدد»…) or a send («أُرسل», «فشل»…): glyph, word and tone. */
export function LinkChip({ tone, label }: { tone: LinkTone; label: string }) {
  return <StatusChip {...TONE_STYLE[tone]} label={label} size="sm" />;
}
