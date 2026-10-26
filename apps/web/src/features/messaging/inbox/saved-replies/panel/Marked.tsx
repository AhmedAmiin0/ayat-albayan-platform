import { highlightParts } from '@ab/shared';

/** A reply's line with the searched letters in <strong> (as WhatsApp's quick-reply list). */
export function Marked({ text, query, strong }: { text: string; query: string; strong: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <strong key={i} className={strong}>
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
