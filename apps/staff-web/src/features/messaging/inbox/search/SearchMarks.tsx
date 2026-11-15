import { highlightParts } from '@ab/shared';

/**
 * The searched words marked inside a bubble's text: bold and a gold underline, never a box (an
 * Arabic run keeps its joins, docs/07 §14.2; not colour alone), the rest as written.
 */
export function SearchMarks({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-transparent font-bold text-ink underline decoration-gold decoration-2 underline-offset-4">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
