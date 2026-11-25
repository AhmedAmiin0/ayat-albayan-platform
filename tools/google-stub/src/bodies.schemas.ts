import { z } from 'zod';

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** Sheets values.append / values.update: rows of cells. */
export const valuesBody = z.object({ values: z.array(z.array(cell)) });

/** A Calendar event as the API sends it; fields the stub never reads are kept as they came. */
export const eventBody = z.looseObject({
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.unknown().optional(),
  end: z.unknown().optional(),
  extendedProperties: z.object({ private: z.record(z.string(), z.string()).optional() }).optional(),
});
export type EventBody = z.infer<typeof eventBody>;

const fileFields = {
  parents: z.array(z.string()).optional(),
  appProperties: z.record(z.string(), z.string()).optional(),
};

/** Drive files.create: a folder or a spreadsheet. */
export const newFileBody = z.object({ name: z.string(), mimeType: z.string(), ...fileFields });

/** The JSON part of a multipart upload or content replace. */
export const fileMeta = z.object({
  name: z.string().optional(),
  mimeType: z.string().optional(),
  ...fileFields,
});
export type FileMeta = z.infer<typeof fileMeta>;

export const revokeBody = z.object({ token: z.string().optional() });
