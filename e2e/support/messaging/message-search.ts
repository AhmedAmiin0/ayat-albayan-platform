import type { Tx } from '../core/rls';

// SQL helpers of message-search.sql.spec.ts (docs/37): rows to search and the RPC call.

interface MsgInput {
  phone: string;
  body: string;
  at?: string;
  template?: string | null;
  extra?: 'hidden' | 'deleted' | 'reaction';
}

const EXTRA = {
  hidden: { hidden_at: new Date().toISOString(), deleted_at: null, payload: null },
  deleted: { hidden_at: null, deleted_at: new Date().toISOString(), payload: null },
  reaction: { hidden_at: null, deleted_at: null, payload: { type: 'reaction' } },
  none: { hidden_at: null, deleted_at: null, payload: null },
} as const;

export async function msg(tx: Tx, input: MsgInput): Promise<string> {
  const x = EXTRA[input.extra ?? 'none'];
  const payload = x.payload ? tx.json(x.payload) : null;
  const [row] = await tx<{ id: string }[]>`
    insert into public.messages (direction, status, phone_e164, body, template_key, created_at,
      hidden_at, deleted_at, interactive_payload)
    values ('outbound', 'delivered', ${input.phone}, ${input.body}, ${input.template ?? null},
      ${input.at ?? new Date().toISOString()}, ${x.hidden_at}, ${x.deleted_at}, ${payload})
    returning id`;
  if (!row) throw new Error('message not written');
  return row.id;
}

interface SearchArgs {
  q: string;
  phones?: string[] | null;
  hide?: string[];
  skip?: string[];
  before?: { at: string; id: string } | null;
  limit?: number;
}

interface SearchHit {
  id: string;
  phone_e164: string;
  created_at: string;
  display_name: string | null;
}

const DEFAULTS = { phones: null, hide: [], skip: [], before: null, limit: 30 } as const;

export async function search(tx: Tx, args: SearchArgs): Promise<SearchHit[]> {
  const a = { ...DEFAULTS, ...args };
  const [at, id] = a.before ? [a.before.at, a.before.id] : [null, null];
  return tx<SearchHit[]>`
    select id, phone_e164, created_at::text as created_at, display_name
    from public.search_messages(${a.q}, ${a.phones}::text[], ${a.hide}::text[], ${a.skip}::text[],
      ${at}::timestamptz, ${id}::uuid, ${a.limit})`;
}

export const ids = (hits: readonly SearchHit[]): string[] => hits.map((h) => h.id);

/** Every fold case of the parity gate (docs/37 tests + review correction 3). */
export const FOLD_CASES: readonly string[] = [
  'مُصْطَفَى', 'الرَّحْمٰنِ', 'ذٰلِكَ الْكِتَابُ', 'قُرْءَانٌ ۖ وَقَالُوا ۚ مَعَ ۗ', 'مســؤول',
  'أحمد إسلام آمنة ٱلحمد', 'مسؤول سائل مدرسة مصطفى', '٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹', 'الحلقة ١٢',
  '۳ أيام', 'Zoom LINK', 'ÉCOLE', 'İstanbul', '  Zoom   LINK ', 'a\tb\nc\r\nd\u000be\u000cf',
  'a b', 'a b', 'a﻿b', 'a 　b', 'a  b', 'a b c',
  'a\u0085b', 'a\u001cb', 'a​b', '   ', '', ' x ',
];
