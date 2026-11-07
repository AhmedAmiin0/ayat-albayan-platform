// The one JSON reader of the lint gates (docs/36 Z-2): text → the caller's zod schema, so no gate
// reads a report, a baseline or a list by hand.
import { readFileSync } from 'node:fs';

/** `text` parsed as JSON, then by `schema` (its errors name the path that failed). */
export const parseJson = (text, schema) => schema.parse(JSON.parse(text));

/** The JSON file at `path`, through `schema`. */
export const readJson = (path, schema) => parseJson(readFileSync(path, 'utf8'), schema);
