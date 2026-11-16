/**
 * What stays in the composer once a send is stored: nothing if the text is still what was sent;
 * what was typed after it if the text still starts with it; else the text as it is now (the
 * user rewrote it during the send, never wiped).
 */
export function afterSend(current: string, sent: string): string {
  if (current === sent) return '';
  return current.startsWith(sent) ? current.slice(sent.length).trimStart() : current;
}
