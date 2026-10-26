import type { GraphEnv } from '../../../../../config/env/env';
import { graphFetch, graphJson, type GraphConn } from '../meta/graph';
import { kapsoMediaSchema, mediaSchema, parsed } from '../meta/meta-shapes';

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

/**
 * Inbound media bytes. Meta: GET /{media id}, then its short-lived URL with the bearer. Kapso: GET
 * /{media id}?phone_number_id=<line>, then download_url (its token is in the URL) with NO credential
 * at all; never Kapso's `url` (Meta's lookaside, which needs a Meta token this line does not have).
 * The byte fetch gets 60 s (a 16 MB video); its signal also covers res.arrayBuffer(). ponytail: a
 * timeout surfaces as WaError status 0 (or a DOMException mid-body) that InboundMedia rethrows as a
 * 500; mapping it to 502/504 is a follow-up (docs/21 §10).
 */
export async function fetchMedia(c: GraphConn, mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const id = encodeURIComponent(mediaId);
  if (c.env.provider === 'kapso') {
    const q = new URLSearchParams({ phone_number_id: c.env.phoneNumberId });
    const meta = parsed(kapsoMediaSchema, await graphJson(c, { path: `${id}?${q}` }));
    const res = await graphFetch(c, { path: meta.download_url, auth: false, timeoutMs: MEDIA_BYTES_TIMEOUT_MS });
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime: meta.mime_type };
  }
  const meta = parsed(mediaSchema, await graphJson(c, { path: id }));
  const res = await graphFetch(c, { path: meta.url, timeoutMs: MEDIA_BYTES_TIMEOUT_MS });
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: meta.mime_type };
}
