import type { Glyph } from '@ab/shared';
import Svg, { Path } from 'react-native-svg';

// The calligrapher's rhombic dot (docs/07 §5–6, docs/design/motif-nuqta-glyphs.svg). Shape carries the
// state, colour only confirms it: fill = settled, half = underway, hollow = waiting, struck = stopped.
// Never above 16px (the empty-state rhombus is its own drawing). Always decorative: the word says it.
const OUTLINE = 'M8 2.9 13.1 8 8 13.1 2.9 8Z';

export interface NuqtaGlyphProps {
  shape: Glyph;
  color: string;
  size?: number;
}

export function NuqtaGlyph({ shape, color, size = 12 }: NuqtaGlyphProps) {
  return (
    <Svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      color={color}
      testID={`nuqta-${shape}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shape === 'fill' ? (
        <Path fill="currentColor" d="M8 2.2 13.8 8 8 13.8 2.2 8Z" />
      ) : (
        <Path fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" d={OUTLINE} />
      )}
      {shape === 'half' && <Path fill="currentColor" d="M2.9 8h10.2L8 13.1Z" />}
      {shape === 'struck' && (
        <Path d="M2.6 13.4 13.4 2.6" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      )}
    </Svg>
  );
}
