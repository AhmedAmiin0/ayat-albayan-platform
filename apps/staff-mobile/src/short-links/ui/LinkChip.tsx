import type { LinkLook } from '@ab/client-core';
import { StatusChip } from '@ab/mobile-kit';
import { TONE } from './link-words';

interface LinkChipProps {
  /** client-core linkStateLook / sendLook: the tone and the glyph. */
  look: Pick<LinkLook<string>, 'tone' | 'glyph'>;
  label: string;
}

/** A link's state («فعّال», «اكتمل العدد»…) or a send («قيد الإرسال», «فشل»…): glyph and word. */
export function LinkChip({ look, label }: LinkChipProps) {
  return <StatusChip tone={TONE[look.tone]} glyph={look.glyph} label={label} size="sm" />;
}
