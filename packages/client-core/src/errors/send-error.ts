// Why a send failed, in words, the same on both apps (R-MSG-05). Each app passes its own
// `t.messages.errors`, read on every call (the admins' translation overrides land after import).

/**
 * The known code's line, else the unknown line carrying the code («(131999)», «(—)» with none).
 * 'unknown' is never looked up itself: its line holds the {code} slot.
 */
export function sendErrorReason(code: string | null | undefined, errors: Readonly<Record<string, string>>): string {
  const known = code && code !== 'unknown' ? errors[code] : undefined;
  return known ?? (errors['unknown'] ?? '').replace('{code}', code || '—');
}
