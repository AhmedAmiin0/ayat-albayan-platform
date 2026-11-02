// Plans the backfill of the old marker rows (owner 2026-10-30): outbound rows stored from the
// WhatsApp Business app's echoes and Kapso's history with a placeholder body («[edit]», «[image]»,
// …) become what the API stores today (echoPayload, migration 20261030000992). Pure: rows in,
// updates out.
//
// What the stored row allows: no raw payload was kept, so an edit's new text and a reaction's emoji
// and target are lost. An edit or revoke whose row kept Meta's context.id (reply_to_wa_id) still
// names its original: the edit marks it edited, the revoke deletes it. Every other marker is only
// hidden (never a bubble again); a file keeps its file without the placeholder caption.

export const PLACEHOLDER = /^\[([a-z_]+)\]$/;
const MARKERS = new Set(['edit', 'revoke', 'reaction']);
const MEDIA = {
  image: 'image/jpeg',
  sticker: 'image/webp',
  audio: 'audio/ogg',
  video: 'video/mp4',
  document: 'application/octet-stream',
};

/** The placeholder's type of a candidate row, else null (any other row is never touched). */
export function placeholderOf(row) {
  if (row.direction !== 'outbound' || row.created_by !== null || typeof row.body !== 'string') return null;
  return PLACEHOLDER.exec(row.body)?.[1] ?? null;
}

function markerPatch(type, row) {
  const target = type === 'reaction' ? null : (row.reply_to_wa_id ?? null);
  const payload = { type, marker: true, target, ...(type === 'edit' ? { text: null } : {}) };
  if (type === 'reaction') Object.assign(payload, { reaction: { message_id: null, emoji: '' } });
  if (!target) payload.unresolved = true;
  const apply = target ? { phone: row.phone_e164, target } : null;
  return { kind: target ? 'applied' : 'hidden', payload, apply };
}

function notePatch(type, row) {
  if (type in MEDIA) {
    const mime = row.media_mime ?? (row.media_id ? MEDIA[type] : null);
    const payload = row.interactive_payload ?? { type, [type]: null };
    return { kind: row.media_id ? 'file' : 'file_missing', payload, mime };
  }
  if (type === 'errors') return { kind: 'ad_welcome', payload: { type, errors: null, welcome: null } };
  return { kind: type === 'unsupported' ? 'unsupported' : 'other', payload: row.interactive_payload ?? { type } };
}

/** One row → its update ({id, type, kind, payload, mime?, apply?}); null = not a candidate. */
export function planRow(row) {
  const type = placeholderOf(row);
  if (!type) return null;
  const patch = MARKERS.has(type) ? markerPatch(type, row) : notePatch(type, row);
  return { id: row.id, phone: row.phone_e164, type, from: row.body, ...patch };
}

/** Every candidate's update, and counts per placeholder type and per outcome. */
export function planAll(rows) {
  const updates = rows.map(planRow).filter((u) => u !== null);
  const counts = { rows: rows.length, candidates: updates.length, byType: {}, byKind: {} };
  for (const u of updates) {
    counts.byType[u.type] = (counts.byType[u.type] ?? 0) + 1;
    counts.byKind[u.kind] = (counts.byKind[u.kind] ?? 0) + 1;
  }
  return { updates, counts };
}
