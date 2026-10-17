import type { WhatsappEnv } from '../../env';
import { graphFetch, graphJson, type GraphConn } from './graph';
import { kapsoMediaSchema, mediaSchema, parsed } from './meta-shapes';

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
export function nextTemplateCursor(env: WhatsappEnv, page: TemplatePage): string | undefined {
  const after = page.paging?.cursors?.after;
  if (env.provider === 'kapso') return after && page.count >= page.limit ? after : undefined;
  return page.paging?.next ? after : undefined;
}

/**
 * Where an edit of a template Meta already knows is POSTed: Meta = /{template id}; Kapso has no
 * such path, it edits through /{waba}/message_templates?hsm_id=<template id>.
 */
export function templateEditPath(env: WhatsappEnv, templateId: string): string {
  if (env.provider !== 'kapso') return templateId;
  return `${encodeURIComponent(env.wabaId)}/message_templates?hsm_id=${encodeURIComponent(templateId)}`;
}

/**
 * Inbound media bytes. Meta: GET /{media id}, then its short-lived URL with the bearer. Kapso: GET
 * /{media id}?phone_number_id=<line>, then download_url (its token is in the URL) with NO credential
 * at all; never Kapso's `url` (Meta's lookaside, which needs a Meta token this line does not have).
 */
export async function fetchMedia(c: GraphConn, mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const id = encodeURIComponent(mediaId);
  if (c.env.provider === 'kapso') {
    const q = new URLSearchParams({ phone_number_id: c.env.phoneNumberId });
    const meta = parsed(kapsoMediaSchema, await graphJson(c, { path: `${id}?${q}` }));
    const res = await graphFetch(c, { path: meta.download_url, auth: false });
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime: meta.mime_type };
  }
  const meta = parsed(mediaSchema, await graphJson(c, { path: id }));
  const res = await graphFetch(c, { path: meta.url });
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: meta.mime_type };
}
