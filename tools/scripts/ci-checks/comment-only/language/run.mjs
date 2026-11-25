// guard:comment-language: no Arabic letter in any comment in scope; no baseline, no allow-list.
import { arabicCommentsOf, hashArabicLinesOf } from './arabic.mjs';
import { scopeOf } from './scope.mjs';

const TAG = 'guard:comment-language:';

const FINDERS = {
  code: (text, path) => arabicCommentsOf(text, path),
  hash: (text) => hashArabicLinesOf(text),
};

/** Logs each hit as `path:line`; returns the exit code. */
export function check({ paths, read, log }) {
  const hits = paths.flatMap((path) => {
    const kind = scopeOf(path);
    const found = kind === null ? [] : FINDERS[kind](read(path), path);
    return found.map(({ line }) => `${path}:${line}`);
  });
  hits.forEach((hit) => log(`${TAG} ${hit}: Arabic in a comment`));
  const verdict = hits.length === 0 ? 'no Arabic in comments' : `${hits.length} comments with Arabic`;
  log(`${TAG} ${verdict}; write comments in English, Arabic only in UI strings.`);
  return hits.length === 0 ? 0 : 1;
}
