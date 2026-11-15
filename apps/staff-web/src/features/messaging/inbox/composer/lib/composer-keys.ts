/** The parts of a textarea keydown the send rule reads (a React KeyboardEvent fits). */
export interface ComposerKey {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  nativeEvent: { isComposing: boolean };
}

/**
 * Does this key send the message? Ctrl/⌘+Enter always. Plain Enter only on a desktop width (from
 * 640px, like WhatsApp Web): Shift+Enter is a new line there, and an IME still composing a word
 * keeps its Enter. On a phone Enter stays a new line (keyed on the width, never on the layout).
 */
export function sendsOnKey(e: ComposerKey, desktop: boolean): boolean {
  if (e.key !== 'Enter') return false;
  if (e.ctrlKey || e.metaKey) return true;
  return desktop && !e.shiftKey && !e.nativeEvent.isComposing;
}
