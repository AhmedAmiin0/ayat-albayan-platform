// The id of the last message she sent herself in each chat (docs/20 W4): the log snaps to the bottom
// when that row arrives, whatever its status by then (the send waits for a sender pass, so it comes
// back 'sent' or 'failed'). A colleague's or an automatic row never moves her. Module memory, this tab only.

const sends = new Map<string, string>();

export function recordOwnSend(phone: string, messageId: string): void {
  sends.set(phone, messageId);
}

export function lastOwnSend(phone: string): string | undefined {
  return sends.get(phone);
}

/** Sign-out on a shared PC: forget every chat. */
export function clearOwnSends(): void {
  sends.clear();
}
