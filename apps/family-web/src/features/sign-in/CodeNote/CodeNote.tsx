import { formatPhone } from '@ab/core';
import { Ltr } from '@ab/web-kit';
import type { CodeNoteProps } from './CodeNote.types';
import { S } from './code-note.helpers';

/** The number is an LTR island; a spaced number is more than isolateLtr handles. */
export function CodeNote({ phone }: CodeNoteProps) {
  const [before = '', after = ''] = S.codeSentTo.split('{phone}');
  return (
    <div className="grid gap-1.5">
      <h2 className="font-display text-h4 font-bold">{S.codeTitle}</h2>
      <p className="text-sm text-pretty text-ink-2">
        {before}
        <Ltr>{formatPhone(phone)}</Ltr>
        {after}
      </p>
    </div>
  );
}
