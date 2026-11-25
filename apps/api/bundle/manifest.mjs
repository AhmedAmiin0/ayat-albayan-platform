import { createRequire } from 'node:module';
import { join } from 'node:path';
import { z } from 'zod';

const exportTarget = z.union([
  z.string(),
  z.object({ default: z.string() }).transform((t) => t.default),
]);

export const manifestSchema = z.object({
  name: z.string(),
  exports: z.record(z.string(), exportTarget).optional(),
  dependencies: z.record(z.string(), z.string()).default({}),
});

const load = createRequire(import.meta.url);

/** @param {string} dir a workspace folder */
export const readManifest = (dir) => manifestSchema.parse(load(join(dir, 'package.json')));
