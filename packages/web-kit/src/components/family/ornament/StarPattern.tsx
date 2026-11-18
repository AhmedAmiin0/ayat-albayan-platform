import { useId } from 'react';

/**
 * The faint eight-point star lattice of the emerald bands (boards: hero, sign-in, next lesson):
 * two 51 px squares, one turned 45°, and a ring, white at 7 %. Inline SVG, decorative, fills its
 * positioned parent.
 */
export function StarPattern() {
  const id = `fam-star-${useId().replace(/:/g, '')}`;
  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2">
            <rect x="10.54" y="10.54" width="50.91" height="50.91" />
            <rect x="10.54" y="10.54" width="50.91" height="50.91" transform="rotate(45 36 36)" />
            <circle cx="36" cy="36" r="8.49" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
