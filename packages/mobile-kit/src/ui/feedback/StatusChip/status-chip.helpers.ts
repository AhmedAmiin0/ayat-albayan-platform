import type { Tone } from '@ab/money';
import type { Palette } from '../../../theme';

/**
 * Foreground + soft background per tone (docs/07 §6). There is no neutral ink: it is ink-2.
 * An unknown tone (a status newer than this bundle, e.g. 'cancelled' on an old OTA) is neutral
 * instead of a crash.
 */
export function toneColors(color: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'ok':
      return { fg: color.ok, bg: color.okSoft };
    case 'act':
      return { fg: color.act, bg: color.actSoft };
    case 'bad':
      return { fg: color.bad, bg: color.badSoft };
    case 'neutral':
    default:
      return { fg: color.ink2, bg: color.neutralSoft };
  }
}
