import { z } from 'zod';

const text = z.string();

type Entry = [string, string];

const textEntries = (map: Record<string, unknown>): Entry[] =>
  Object.entries(map).flatMap(([key, value]): Entry[] => {
    const parsed = text.safeParse(value);
    return parsed.success ? [[key, parsed.data]] : [];
  });

/** The overrides map; a value that is not text is dropped, so a bad entry changes nothing. */
export const overridesSchema = z
  .record(z.string(), z.unknown())
  .transform((map) => Object.fromEntries(textEntries(map)));

export type Overrides = z.infer<typeof overridesSchema>;
