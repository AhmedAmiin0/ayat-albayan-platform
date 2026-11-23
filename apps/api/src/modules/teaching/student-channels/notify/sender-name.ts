/**
 * A profile's shown name, or the fallback (its role word) when it has none: an empty or
 * whitespace-only name counts as none, so a push or bell never shows a blank sender.
 */
export function senderName(
  names: ReadonlyMap<string, string>,
  profileId: string,
  fallback: string,
): string {
  const name = names.get(profileId)?.trim() ?? '';
  return name === '' ? fallback : name;
}
