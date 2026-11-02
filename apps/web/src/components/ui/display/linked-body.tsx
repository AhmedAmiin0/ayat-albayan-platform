import { splitLinks } from '@ab/shared';
import { Fragment, type ReactNode } from 'react';

const plain = (text: string): ReactNode => text;

interface LinkedBodyProps {
  text: string;
  /** How each run of text is drawn (the chat search marks its words); as written by default. */
  mark?: (text: string) => ReactNode;
}

/** A chat text with its http(s) and www. links clickable (W11, splitLinks): the inbox and the student channel. */
export function LinkedBody({ text, mark = plain }: LinkedBodyProps) {
  return (
    <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all text-lapis underline underline-offset-4">
            {mark(part.text)}
          </a>
        ) : (
          <Fragment key={i}>{mark(part.text)}</Fragment>
        ),
      )}
    </p>
  );
}
