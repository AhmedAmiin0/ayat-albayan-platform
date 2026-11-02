// The planned updates → one SQL transaction (markers-plan.mjs). Idempotent: each update only
// takes a row that still holds its placeholder, the marker apply stamps applied_at, and the
// summaries recompute.

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

/** The SELECT whose JSON the plan reads (psql: \copy (…) to 'markers.json'). */
export const EXPORT_SQL = `select coalesce(json_agg(r), '[]') from (
  select id, direction, created_by, phone_e164, body, reply_to_wa_id, media_id, media_mime,
    interactive_payload, wa_message_id, created_at
  from public.messages
  where direction = 'outbound' and created_by is null and body ~ '^\\[[a-z_]+\\]$'
  order by created_at, id
) r`;

function updateOf(u) {
  const mime = u.mime ? `, media_mime = coalesce(media_mime, ${q(u.mime)})` : '';
  const payload = `${q(JSON.stringify(u.payload))}::jsonb`;
  return `update public.messages set body = null, interactive_payload = ${payload}${mime}
  where id = ${q(u.id)} and body = ${q(u.from)};`;
}

const applyOf = (u) =>
  `select public.message_markers_apply(${q(u.apply.phone)}, ${q(u.apply.target)}, '-infinity');`;

/** The transaction: updates, then the markers that name a stored original, then the summaries. */
export function buildSql(updates, { commit }) {
  const applies = updates.filter((u) => u.apply);
  const phones = [...new Set(updates.map((u) => u.phone))];
  return [
    '-- chat-markers backfill (tools/scripts/chat-markers). Generated: review, then run with psql.',
    'begin;',
    ...updates.map(updateOf),
    ...applies.map(applyOf),
    phones.length ? `select public.thread_summary_refresh_all(array[${phones.map(q).join(', ')}]);` : '',
    commit ? 'commit;' : 'rollback;',
    '',
  ].filter((l) => l !== '').join('\n') + '\n';
}
