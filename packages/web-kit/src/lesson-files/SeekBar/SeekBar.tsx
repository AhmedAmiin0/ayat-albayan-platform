import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import type { Props } from './SeekBar.types';
import { P, seekBarView } from './seek-bar.helpers';

/** Each time is an LTR island in the RTL row. */
export function SeekBar(props: Props) {
  const bar = seekBarView(props);
  return (
    <div className="grid gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={P.seek}
        aria-valuemin={0}
        aria-valuemax={bar.max}
        aria-valuenow={bar.now}
        aria-valuetext={bar.valueText}
        onKeyDown={bar.onKeyDown}
        onPointerDown={bar.onPointerDown}
        onPointerMove={bar.onPointerMove}
        className="flex h-6 cursor-pointer touch-none items-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {/* The fill and the knob follow the play with no easing: a scrub never lags the finger. */}
        <div className="relative h-1.5 w-full rounded-full bg-sunk">
          <div className="h-1.5 rounded-full bg-lapis" style={{ width: `${bar.share}%` }} />
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-lapis ring-4 ring-lapis-wash"
            style={{ insetInlineStart: `calc(${bar.share}% - 0.5rem)` }}
          />
        </div>
      </div>
      <p className="flex justify-between text-xs text-ink-3">
        <Ltr>{bar.at}</Ltr>
        <Ltr>{bar.total}</Ltr>
      </p>
    </div>
  );
}
