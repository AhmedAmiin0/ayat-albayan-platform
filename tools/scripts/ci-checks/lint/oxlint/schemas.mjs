// zod schemas of the files the Oxlint gate and the parity check read (docs/31b, CLAUDE.md 12).
import { z } from 'zod';

const span = z.object({ span: z.object({ line: z.number() }) });

/** `oxlint --format json`: its diagnostics (a parse error has no code). */
export const oxlintReport = z.object({
  diagnostics: z.array(
    z.object({
      filename: z.string(),
      code: z.string().optional(),
      labels: z.array(span).optional(),
    }),
  ),
});

/** oxlint-suppressions.json (and eslint-suppressions.json): file → rule → count. */
export const baselineFile = z.record(
  z.string(),
  z.record(z.string(), z.object({ count: z.number().int().positive() })),
);

/** `eslint --format json`: per file, its messages (a parse error has no rule). */
export const eslintReport = z.array(
  z.object({
    filePath: z.string(),
    messages: z.array(z.object({ ruleId: z.string().nullable(), line: z.number().optional() })),
  }),
);

/** parity/gaps.json: rule → its reviewed missed count and why Oxlint cannot report it yet. */
export const gapsFile = z.record(
  z.string(),
  z.object({ missed: z.number().int().positive(), why: z.string() }),
);

const ruleMap = z.record(z.string(), z.unknown());

/** .oxlintrc.json: the rule blocks lint-gate.mjs reads (oxlintSuppressed). */
export const oxlintrcFile = z.looseObject({
  rules: ruleMap.optional(),
  overrides: z.array(z.looseObject({ rules: ruleMap.optional() })).optional(),
});

/** A saved list of findings (LINT_PARITY_ESLINT). */
export const findingsFile = z.array(
  z.object({ file: z.string(), line: z.number(), rule: z.string() }),
);
