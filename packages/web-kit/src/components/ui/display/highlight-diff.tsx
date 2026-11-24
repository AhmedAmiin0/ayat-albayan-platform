import { diffSegments } from '@ab/core';

export interface HighlightDiffProps {
  /** The name to show, exactly as typed / stored. */
  text: string;
  /** The name it is compared with; letters of `text` that differ get underlined. */
  against: string;
}

/** R-STU-03: the diff letter is a plain span so Arabic joining survives; wrap it in flex. */
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
