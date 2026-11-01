import { phoneE164 } from '@ab/shared';
import { z } from 'zod';

// The old Apps Script's POST /api/v1/messages bodies (docs/19 «script relay»), parsed at the
// boundary (rule 12). Unknown keys are stripped; `to` (international digits, «+» or not) → E.164.

/** Bare international digits get their «+»; a local or «00» number goes to the helper as is. */
const withPlus = (raw: string): string => (/^[1-9][0-9]+$/.test(raw) ? `+${raw}` : raw);

const to = z.string().trim().transform(withPlus).pipe(phoneE164);
const name = z.string().trim().max(200).optional();
const text = z.string().trim().min(1).max(4096);
const link = z.url({ protocol: /^https?$/ });
const optional = z.string().trim().max(1024).optional();

const templateSchema = z.object({
  to,
  type: z.literal('template'),
  name,
  template: z.object({
    name: z.string().trim().min(1).max(512),
    language: z.string().trim().min(1).max(15),
    params: z
      .object({
        body: z.array(z.string().max(1024)).max(30).optional(),
        buttonParams: z.record(z.string().regex(/^[0-9]$/), z.string().max(2000)).optional(),
      })
      .default({}),
  }),
});

const textSchema = z.object({ to, type: z.literal('text'), name, text });

const NO_DOCUMENT: { link?: string; filename?: string; caption?: string } = {};
const firstSet = (...values: (string | undefined)[]): string | undefined =>
  values.find((v) => v !== undefined);

/** The script sends the link four ways (link, url, media_url, document.link): first set wins. */
const documentSchema = z
  .object({
    to,
    type: z.literal('document'),
    name,
    text: optional,
    caption: optional,
    filename: optional,
    link: link.optional(),
    url: link.optional(),
    media_url: link.optional(),
    document: z.object({ link: link.optional(), filename: optional, caption: optional }).optional(),
  })
  .transform((d, ctx) => {
    const doc = d.document ?? NO_DOCUMENT;
    const url = firstSet(doc.link, d.link, d.media_url, d.url);
    if (!url) {
      ctx.addIssue({ code: 'custom', message: 'document link is required', path: ['link'] });
      return z.NEVER;
    }
    const caption = firstSet(doc.caption, d.caption, d.text);
    const filename = firstSet(doc.filename, d.filename);
    return { to: d.to, type: d.type, name: d.name, link: url, caption, filename };
  });

export const relayRequestSchema = z.discriminatedUnion('type', [
  templateSchema,
  textSchema,
  documentSchema,
]);

export type RelayRequest = z.infer<typeof relayRequestSchema>;
export type RelayType = RelayRequest['type'];
export type RelayOf<T extends RelayType> = Extract<RelayRequest, { type: T }>;
