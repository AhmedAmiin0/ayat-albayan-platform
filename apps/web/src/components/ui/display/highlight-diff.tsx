import { diffSegments } from '@ab/shared';

export interface HighlightDiffProps {
  /** The name to show, exactly as typed / stored. */
  text: string;
  /** The name it is compared with; letters of `text` that differ get underlined. */
  against: string;
}

/**
 * Duplicate dialog «سهيلة» vs «سهيله» (R-STU-03, docs/07 §14.2). ONE inline run: the differing
 * letter is a plain inline <span> with colour + underline only (no padding, margin, border,
 * background or ZWJ), so Arabic joining survives. Never put this inside a flex/grid parent
 * without wrapping it in its own span; this component already returns a single span.
 */
export function HighlightDiff({ text, against }: HighlightDiffProps) {
  return (
    <span>
      {diffSegments(text, against).map((s, i) =>
        s.diff ? (
          <span
            key={i}
            data-diff=""
            className="text-act underline decoration-act decoration-2 underline-offset-[7px] [text-decoration-skip-ink:none]"
          >
            {s.text}
          </span>
        ) : (
          s.text
        ),
      )}
    </span>
  );
}
