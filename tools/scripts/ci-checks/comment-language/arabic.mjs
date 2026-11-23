// Comments hold English only; Arabic belongs in UI strings (CLAUDE.md rule 24).
import { commentsOf } from '../comment-only/comments.mjs';

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Each comment with an Arabic letter and the line it starts on; strings and JSX text are code. */
export function arabicCommentsOf(text, file) {
  if (!ARABIC.test(text)) return [];
  let from = 0;
  return commentsOf(text, file).flatMap((comment) => {
    const at = text.indexOf(comment, from);
    from = at + comment.length;
    return ARABIC.test(comment) ? [{ line: lineAt(text, at), comment }] : [];
  });
}

/** A `#` at a line start or after a space opens a YAML or shell comment. */
const HASH_COMMENT = /(?:^|\s)#(.*)$/;

export const hashArabicLinesOf = (text) =>
  text.split('\n').flatMap((line, i) => {
    const comment = HASH_COMMENT.exec(line)?.[1] ?? '';
    return ARABIC.test(comment) ? [{ line: i + 1, comment }] : [];
  });
