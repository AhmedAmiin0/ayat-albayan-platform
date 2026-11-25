// zod schemas of the files the lint gate reads (docs/31b, CLAUDE.md 12).
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

/** oxlint-suppressions.json: file → rule → count. */
export const baselineFile = z.record(
  z.string(),
  z.record(z.string(), z.object({ count: z.number().int().positive() })),
);

/** The root package.json: the `lint:report` script run.mjs runs. */
export const rootManifest = z.object({ scripts: z.object({ 'lint:report': z.string() }) });
