// `{name}` slots of the UI copy and `{{n}}` slots of WhatsApp-style strings: an override must keep
// every slot its default has, or the code filling them would print a sentence without its value.

const TOKEN = /\{\{\d+\}\}|\{[A-Za-z0-9_]+\}/g;

/** The distinct slots of a string, sorted: '{n} / {total}' → ['{n}', '{total}']. */
export function placeholderTokens(text: string): string[] {
  return [...new Set(text.match(TOKEN) ?? [])].sort();
}

/** The slots of `defaultText` that `value` lacks (empty = the override is safe). */
export function missingPlaceholders(defaultText: string, value: string): string[] {
  const have = new Set(placeholderTokens(value));
  return placeholderTokens(defaultText).filter((tok) => !have.has(tok));
}
