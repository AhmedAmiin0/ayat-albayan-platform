import { chatFileMaxBytes } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import type { Http } from '@/common/infra/http/http.types';
import type { GraphEnv } from '@/config/env/env';
import { graphDownload, graphHttp, providerOf, type GraphConn } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { kapsoMediaSchema, mediaSchema } from '@/modules/messaging/whatsapp/drivers/meta/meta-shapes';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';

// Where the two drivers differ (docs/19-messaging-drivers.md). Kapso's Meta proxy mirrors the Cloud
// API (same paths, bodies, Meta-shaped errors) except the template list's paging, template edits
// and inbound media. Everything else is the shared HttpWhatsappClient.

interface TemplatePage {
  /** Templates on this page. */
  count: number;
  /** The `limit` the page was asked with. */
  limit: number;
  paging?: { next?: string; cursors?: { after?: string } };
}

/**
 * The next page's cursor, or undefined when the list is done. Meta says so with paging.next; Kapso
 * never sends it, so there a full page with an `after` cursor means there may be more.
 */
export function nextTemplateCursor(env: GraphEnv, page: TemplatePage): string | undefined {
  const after = page.paging?.cursors?.after;
  if (env.provider === 'kapso') return after && page.count >= page.limit ? after : undefined;
  return page.paging?.next ? after : undefined;
}

/**
 * Where an edit of a template Meta already knows is POSTed: Meta = /{template id}; Kapso has no
 * such path, it edits through /{waba}/message_templates?hsm_id=<template id>.
 */
export function templateEditPath(env: GraphEnv, templateId: string): string {
  if (env.provider !== 'kapso') return templateId;
  return `${encodeURIComponent(env.wabaId)}/message_templates?hsm_id=${encodeURIComponent(templateId)}`;
}

/** The media byte download's timeout (the JSON lookup keeps the connection's). */
export const MEDIA_BYTES_TIMEOUT_MS = 60_000;

/** Where a media id's bytes are, and which profile fetches them. */
interface Located {
  url: string;
  mime: string;
  http: Http;
}

type Locate = (c: GraphConn, id: string) => Promise<Located>;

/** Meta: GET /{media id}, then its short-lived URL with the bearer. */
const metaMedia: Locate = async (c, id) => {
  const meta = await graphHttp(c).json({ path: id, schema: mediaSchema });
  return { url: meta.url, mime: meta.mime_type, http: graphHttp(c) };
};

/** Kapso: GET /{media id}?phone_number_id=<line>, then download_url with NO credential at all. */
const kapsoMedia: Locate = async (c, id) => {
  const query = { phone_number_id: c.env.phoneNumberId };
  const meta = await graphHttp(c).json({ path: id, query, schema: kapsoMediaSchema });
  return { url: meta.download_url, mime: meta.mime_type, http: graphDownload(c) };
};

const LOCATE = { meta: metaMedia, kapso: kapsoMedia } satisfies Record<
  ReturnType<typeof providerOf>,
  Locate
>;

const tooLarge = (): Error => waHttpError('invoice_too_large', HttpStatus.PAYLOAD_TOO_LARGE);

/**
 * Inbound media bytes, as the line's driver serves them: never Kapso's `url` (Meta's lookaside,
 * which needs a Meta token this line does not have). The byte fetch gets 60 s (a 16 MB video),
 * the body read included, and is cut while streaming at chatFileMaxBytes(mime): 413
 * invoice_too_large. ponytail: a timeout surfaces as WaError status 0 that InboundMedia rethrows
 * as a 500; mapping it to 502/504 is a follow-up (docs/21 §10).
 */
export async function fetchMedia(
  c: GraphConn,
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const at = await LOCATE[providerOf(c.env)](c, encodeURIComponent(mediaId));
  const maxBytes = chatFileMaxBytes(at.mime);
  const call = { path: at.url, timeoutMs: MEDIA_BYTES_TIMEOUT_MS, maxBytes, tooLarge };
  const { bytes } = await at.http.bytes(call);
  return { bytes, mime: at.mime };
}
