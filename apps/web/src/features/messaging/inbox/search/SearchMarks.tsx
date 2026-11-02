import { highlightParts } from '@ab/shared';

/** The searched words lit up inside a bubble's text (WhatsApp's yellow), the rest as written. */
export function SearchMarks({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-gold-wash text-ink">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
