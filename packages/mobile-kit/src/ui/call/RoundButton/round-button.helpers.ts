import { z } from 'zod';
import type { Palette } from '../../../theme';
import { type RoundTone, roundToneSchema } from './round-button.schemas';

const solidColorSchema = z.enum(['badSolid', 'onBad', 'lapisFill', 'onLapis']);
const solidSchema = z.object({ fill: solidColorSchema, ink: solidColorSchema });

const SOLID = z
  .record(roundToneSchema, solidSchema.nullable())
  .readonly()
  .decode({
    end: { fill: 'badSolid', ink: 'onBad' },
    accept: { fill: 'lapisFill', ink: 'onLapis' },
    plain: null,
  });

/**
 * End and accept are solid. Plain is outlined in coverInk for at least 3:1 non-text contrast on
 * the cover, and fills when its toggle is on.
 */
export function roundColors(color: Palette, tone: RoundTone, on: boolean) {
  const solid = SOLID[tone];
  const outline = {
    fill: on ? color.coverInk : 'transparent',
    ink: on ? color.cover : color.coverInk,
    edge: { borderWidth: 1.5, borderColor: color.coverInk },
  };
  return solid ? { fill: color[solid.fill], ink: color[solid.ink], edge: {} } : outline;
}
