/** The text that went out and its client_id, kept until the API has it. */
export interface SendAttempt {
  body: string;
  clientId: string;
}

/**
 * The client_id of this send: the failed attempt's when the same text is sent again (a retry the
 * server may already hold), else a new one.
 */
export function sendIdFor(last: SendAttempt | null, body: string, fresh: () => string): string {
  return last?.body === body ? last.clientId : fresh();
}

/**
 * What stays in the box once `sent` went out: only what was sent leaves, so words typed while it
 * was sending survive; a box changed in the meantime is left as it is.
 */
export function remainingDraft(current: string, sent: string): string {
  return current.startsWith(sent) ? current.slice(sent.length).trimStart() : current;
}
