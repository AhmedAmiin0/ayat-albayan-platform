import { placeholderToken, SAVED_REPLY_PLACEHOLDERS, type SavedReplyPlaceholder } from '@ab/shared';
import type { RefObject } from 'react';
import { t } from '@/lib/i18n';

export interface PlaceholderChipsProps {
  /** The reply's text box: the token goes where its caret is. */
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}

/** The text with `token` at the caret (or the end), and where the caret goes next. */
export function insertAt(input: { value: string; token: string; at: number | null }): { text: string; caret: number } {
  const at = input.at ?? input.value.length;
  return { text: input.value.slice(0, at) + input.token + input.value.slice(at), caret: at + input.token.length };
}

/** «اسم العميل» «اسم الطالب» «اسمك»: each inserts its placeholder at the caret of the text box. */
export function PlaceholderChips({ target, value, onChange }: PlaceholderChipsProps) {
  const insert = (key: SavedReplyPlaceholder) => {
    const box = target.current;
    const { text, caret } = insertAt({ value, token: placeholderToken(key), at: box ? box.selectionStart : null });
    onChange(text);
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(caret, caret);
    });
  };
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-ink-2">{t.savedReplies.placeholdersLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {SAVED_REPLY_PLACEHOLDERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => insert(key)}
            className="min-h-11 rounded-full border border-rule bg-sunk px-3 text-xs text-ink hover:bg-accent sm:min-h-8"
          >
            {t.savedReplies.placeholders[key]}
            <span className="ms-1 text-ink-3" dir="ltr">{placeholderToken(key)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-3">{t.savedReplies.placeholdersHint}</p>
    </div>
  );
}
