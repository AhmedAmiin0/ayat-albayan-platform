import { splitLinks } from '@ab/shared';

/** The text with its http(s) and www. links clickable (W11, splitLinks). */
export function LinkedBody({ text }: { text: string }) {
  return (
    <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all text-lapis underline underline-offset-4">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}
