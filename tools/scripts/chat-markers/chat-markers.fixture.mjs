// Marker rows as staging holds them (2026-10-30 counts: [reaction] 102, [edit] 16, [image] 15,
// [errors] 15, [audio] 11, [unsupported] 4, [revoke] 3, [document] 1, [video] 1). Fake ids and
// phones.
const row = (id, body, over = {}) => ({
  id: `00000000-0000-4000-8000-0000000009${id}`,
  direction: 'outbound',
  created_by: null,
  phone_e164: '+966501234567',
  body,
  reply_to_wa_id: null,
  media_id: null,
  media_mime: null,
  interactive_payload: null,
  wa_message_id: `wamid.FIX${id}`,
  created_at: '2026-10-29T10:00:00Z',
  ...over,
});

export const ROWS = [
  row('01', '[edit]', { reply_to_wa_id: 'wamid.ORIGINAL1' }),
  row('02', '[edit]'),
  row('03', '[revoke]', { reply_to_wa_id: "wamid.O'2" }),
  row('04', '[reaction]', { interactive_payload: { type: 'reaction' } }),
  row('05', '[image]', { media_id: '1092837465', media_mime: 'image/jpeg', interactive_payload: null }),
  row('06', '[audio]', { media_id: '1092837466' }),
  row('07', '[document]'),
  row('08', '[errors]'),
  row('09', '[unsupported]'),
  row('10', '[location]'),
  // Never touched: a real text, a staff send, an inbound row, an already fixed one.
  row('11', 'تم [edit] في النص'),
  row('12', '[edit]', { created_by: 'a0000000-0000-4000-8000-000000000001' }),
  row('13', '[edit]', { direction: 'inbound' }),
  row('14', null, { interactive_payload: { type: 'edit', marker: true, target: 'x' } }),
];
