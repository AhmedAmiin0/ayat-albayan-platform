import { z } from 'zod';

// One schema per Google answer the adapter reads (docs/36 h7). External bodies stay loose, and a
// field the sync only looks at falls back to what a missing field meant before.

const text = z.string();
const strings = z.record(z.string(), z.string());

/** PUT / PATCH / DELETE / batchUpdate: the answer is ignored (often an empty 204). */
export const ignoredAnswer = z.unknown();

/** insert / create / upload: the new resource's id. */
export const createdAnswer = z.looseObject({ id: text });

/** calendarList.list: one page. */
export const calendarPageAnswer = z.looseObject({
  items: z.array(z.looseObject({ id: text, summary: text.optional() })).optional(),
  nextPageToken: text.optional(),
});

const eventFields = {
  id: text,
  /** '' reads like a missing status did: not 'cancelled'. */
  status: text.catch(''),
  extendedProperties: z.looseObject({ private: strings.optional() }).optional().catch(undefined),
};

/** events.get */
export const eventAnswer = z.looseObject(eventFields);

const listedEvent = z.looseObject({
  ...eventFields,
  summary: text.optional(),
  description: text.optional(),
  start: z.looseObject({ dateTime: text.optional(), date: text.optional() }).optional(),
});

/** events.list: one page of single events. */
export const eventsAnswer = z.looseObject({ items: z.array(listedEvent).optional() });

/** files.get (the FIELDS the adapter asks for). */
export const fileAnswer = z.looseObject({
  id: text,
  name: text,
  mimeType: text,
  trashed: z.boolean().optional(),
  appProperties: strings.optional(),
});

/** files.list */
export const filesAnswer = z.looseObject({ files: z.array(fileAnswer).optional() });

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** spreadsheets.values.get */
export const valuesAnswer = z.looseObject({ values: z.array(z.array(cell)).optional() });

/** spreadsheets.values.append */
export const appendAnswer = z.looseObject({
  updates: z.looseObject({ updatedRange: text.optional() }).optional(),
});
