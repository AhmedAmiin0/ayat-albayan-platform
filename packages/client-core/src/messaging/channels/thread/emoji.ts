// The emoji sheet's curated set (owner 2026-10-27: ~80 built-in emoji, no emoji library): faces,
// hands, hearts and the academy's own (the Quran, the mosque, a lesson's time). Order = reading
// order.
// oxfmt-ignore
export const EMOJI: readonly string[] = [
  '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍', '🥰', '😘', '😇', '🤗',
  '🤩', '😎', '🤔', '🤲', '🙏', '👍', '👌', '👏', '🙌', '💪', '✋', '👋',
  '🤝', '☝️', '✌️', '👆', '👇', '👉', '👈', '😅', '😂', '🥲', '😢', '😭',
  '😔', '😞', '😌', '🙈', '❤️', '💚', '💙', '💛', '🤍', '💜', '💯', '✨',
  '🌟', '⭐', '🔥', '🎉', '🎊', '🎁', '🌹', '🌸', '🌷', '🍃', '☀️', '🌙',
  '⏰', '📅', '📖', '📚', '✏️', '📝', '📌', '✅', '☑️', '❌', '❓', '❗',
  '🕌', '🕋', '📿', '🏆', '🥇', '👦', '👧', '👨‍🏫', '👩‍🏫',
];

interface Selection {
  start: number;
  end: number;
}

/** `emoji` put in place of the selection (the caret when empty); the caret then sits after it. */
export function insertAt(
  text: string,
  sel: Selection,
  emoji: string,
): { text: string; caret: number } {
  const start = Math.max(0, Math.min(sel.start, sel.end, text.length));
  const end = Math.min(text.length, Math.max(sel.start, sel.end, start));
  return { text: text.slice(0, start) + emoji + text.slice(end), caret: start + emoji.length };
}
