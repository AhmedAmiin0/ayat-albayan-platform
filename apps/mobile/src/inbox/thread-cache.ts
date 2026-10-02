import type { MessageView, ThreadDetail } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { pathKey } from '@/lib/query-keys';

// One WhatsApp thread (docs/12 H2): paths, query key and the cache edits an optimistic send makes.
// The cache is an infinite query: pages[0] is the newest page, each next page is older.

export type ThreadCache = InfiniteData<ThreadDetail>;

/** App route of a thread. The + travels encoded (%2B); useLocalSearchParams decodes it. */
export const threadHref = (phone: string) => `/inbox/thread/${encodeURIComponent(phone)}`;
/** API path of a thread (GET /threads/:phone, POST …/text, POST …/template). */
export const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;
/** ['threads', phone]: a push for this phone refreshes exactly this thread. */
export const threadKey = (phone: string) => pathKey(`/threads/${phone}`);

/** Oldest → newest across the loaded pages; a row a refetch already brought in shows once. */
export function threadMessages(data: ThreadCache | undefined): MessageView[] {
  const seen = new Set<string>();
  const out: MessageView[] = [];
  for (const m of [...(data?.pages ?? [])].reverse().flatMap((p) => p.messages)) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function mapMessages(
  data: ThreadCache | undefined,
  edit: (messages: MessageView[], index: number) => MessageView[],
): ThreadCache | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p, i) => ({ ...p, messages: edit(p.messages, i) })) };
}

/** Puts a just-sent row at the end of the newest page. */
export function appendMessage(data: ThreadCache | undefined, row: MessageView) {
  return mapMessages(data, (messages, i) => (i === 0 ? [...messages, row] : messages));
}

/** Swaps the row with this id (the provisional one, or a retried one) for the server's row. */
export function replaceMessage(data: ThreadCache | undefined, id: string, row: MessageView) {
  return mapMessages(data, (messages) => messages.map((m) => (m.id === id ? row : m)));
}

/** Rollback of a send the API refused. */
export function removeMessage(data: ThreadCache | undefined, id: string) {
  return mapMessages(data, (messages) => messages.filter((m) => m.id !== id));
}

export interface Provisional {
  id: string;
  phone: string;
  body: string;
  templateKey?: string;
  now?: Date;
}

/** The row an optimistic send shows until the API answers: queued, ours, no wa.me link yet. */
export function provisionalMessage(p: Provisional): MessageView {
  return {
    id: p.id,
    direction: 'outbound',
    status: 'queued',
    phone_e164: p.phone,
    lead_id: null,
    guardian_id: null,
    lesson_id: null,
    template_key: p.templateKey ?? null,
    template_params: null,
    body: p.body,
    media_mime: null,
    media_url: null,
    reply_to_wa_id: null,
    interactive_payload: null,
    error_code: null,
    error_text: null,
    attempts: 0,
    next_attempt_at: null,
    scheduled_for: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
    sent_manually_at: null,
    created_at: (p.now ?? new Date()).toISOString(),
    click_to_chat: null,
    lesson: null,
  };
}
