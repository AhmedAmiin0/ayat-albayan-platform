// The emoji sheet's curated set (owner 2026-10-27: ~80 built-in emoji, no emoji library): faces,
// hands, hearts and the academy's own (the Quran, the mosque, a lesson's time). Order = reading order.
export const EMOJI: readonly string[] = [
  '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍', '🥰', '😘', '😇', '🤗',
  '🤩', '😎', '🤔', '🤲', '🙏', '👍', '👌', '👏', '🙌', '💪', '✋', '👋',
  '🤝', '☝️', '✌️', '👆', '👇', '👉', '👈', '😅', '😂', '🥲', '😢', '😭',
  '😔', '😞', '😌', '🙈', '❤️', '💚', '💙', '💛', '🤍', '💜', '💯', '✨',
  '🌟', '⭐', '🔥', '🎉', '🎊', '🎁', '🌹', '🌸', '🌷', '🍃', '☀️', '🌙',
  '⏰', '📅', '📖', '📚', '✏️', '📝', '📌', '✅', '☑️', '❌', '❓', '❗',
  '🕌', '🕋', '📿', '🏆', '🥇', '👦', '👧', '👨‍🏫', '👩‍🏫',
];

/** `emoji` put in place of the selection (the caret when empty); the caret then sits after it. */
export function insertAt(text: string, sel: { start: number; end: number }, emoji: string): { text: string; caret: number } {
  const start = Math.max(0, Math.min(sel.start, sel.end, text.length));
  const end = Math.min(text.length, Math.max(sel.start, sel.end, start));
  return { text: text.slice(0, start) + emoji + text.slice(end), caret: start + emoji.length };
}
