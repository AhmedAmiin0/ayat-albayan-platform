// The unsent reply of each chat, kept for this tab's life (W5): it survives a thread switch (the
// pane is keyed by phone), the «قالب» toggle and the window flipping. The request id goes with the
// text, so a draft retried after a failed send keeps its clientRequestId (rule 8).

export interface Draft {
  text: string;
  requestId: string;
}

const drafts = new Map<string, Draft>();

/** The chat's draft, or a fresh empty one (not stored until it is set). */
export function getDraft(phone: string): Draft {
  return drafts.get(phone) ?? { text: '', requestId: crypto.randomUUID() };
}

export function setDraft(phone: string, draft: Draft): void {
  drafts.set(phone, draft);
}

export function clearDraft(phone: string): void {
  drafts.delete(phone);
}
