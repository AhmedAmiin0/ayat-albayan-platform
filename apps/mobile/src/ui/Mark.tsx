import Svg, { Circle, Path } from 'react-native-svg';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';

// Logo mark (docs/07 §11, docs/design/logo.svg + logo-small.svg): the verse-end rosette holding an
// alef with madda. Always gold, never lapis, never struck. 28px or less uses the heavier small mark.
const ROSETTE =
  'M32 7A7 7 0 0 1 44.5 10.35A7 7 0 0 1 53.65 19.5A7 7 0 0 1 57 32A7 7 0 0 1 53.65 44.5A7 7 0 0 1 44.5 53.65A7 7 0 0 1 32 57A7 7 0 0 1 19.5 53.65A7 7 0 0 1 10.35 44.5A7 7 0 0 1 7 32A7 7 0 0 1 10.35 19.5A7 7 0 0 1 19.5 10.35A7 7 0 0 1 32 7Z';
const LARGE = {
  alef: 'M31.9 24.8L33.3 24.2C34.2 26.2 34.3 29 34.2 32.2C34.1 37.2 33.2 42.6 32.4 46.6C32.2 47.7 31 47.8 30.8 46.8C30.3 42.6 30.2 37.6 30.4 32.4C30.6 29.2 31 26.6 31.9 24.8Z',
  madda: 'M38.6 17.4C37.6 18.7 36.2 19.1 34 18.9C31 18.6 28 18.3 26.5 18.9C25.6 19.4 25.2 20.6 25.4 22.1C26.1 21.5 26.8 21.3 27.6 21.2C29.6 21.1 31.6 21.7 34 21.7C36.5 21.7 38.1 20.1 38.6 17.4Z',
};
const SMALL = {
  alef: 'M31.2 24.6L33.8 23.5C35.1 25.6 35.4 28.8 35.3 32.2C35.2 37.4 34.1 42.8 33.2 46.8C32.8 48.5 30.8 48.6 30.4 46.9C29.7 42.6 29.5 37.6 29.7 32.4C29.9 28.8 30.3 26.4 31.2 24.6Z',
  madda: 'M40.2 16.8C39 18.6 37 19.2 34.2 18.9C30.8 18.6 27.4 18.2 25.6 19C24.4 19.6 23.8 21 24.2 22.8C24.9 22 25.8 21.6 26.9 21.5C29.4 21.4 31.8 22 34.2 22C37.4 22 39.6 20.2 40.2 16.8Z',
};

export interface MarkProps {
  /** Rendered size; 28 or less switches to logo-small (no inner ring, heavier rosette). */
  size?: number;
  /** Decorative by default; `labelled` exposes it as an image named «آيات البيان». */
  labelled?: boolean;
}

export function Mark({ size = 28, labelled = false }: MarkProps) {
  const { color } = useTheme();
  const small = size <= 28;
  const glyph = small ? SMALL : LARGE;
  const a11y = labelled
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: t.app.brand }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      color={color.gold}
      testID={small ? 'mark-small' : 'mark-large'}
      {...a11y}
    >
      <Path fill="none" stroke="currentColor" strokeWidth={small ? 4.5 : 2} d={ROSETTE} />
      {!small && <Circle cx={32} cy={32} r={17.5} fill="none" stroke="currentColor" strokeWidth={1.25} />}
      <Path fill="currentColor" d={glyph.alef} />
      <Path fill="currentColor" d={glyph.madda} />
    </Svg>
  );
}
