// The lines a zero-context diff adds, and which changed files guard:mappers reads.
const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const MAPPER = /^apps\/api\/src\/.+\.mapper\.ts$/;

const range = (start, count) => Array.from({ length: count }, (_, i) => start + i);

/** Line numbers on the new side of `git diff -U0` output. */
export const addedLines = (diff) =>
  new Set(
    diff
      .split('\n')
      .map((line) => HUNK.exec(line))
      .filter((hit) => hit !== null)
      .flatMap(([, start, count]) => range(Number(start), Number(count ?? 1))),
  );

export const isMapperPath = (path) => MAPPER.test(path);
