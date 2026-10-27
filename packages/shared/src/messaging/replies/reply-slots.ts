import {
  resolveSavedReply,
  SAVED_REPLY_PLACEHOLDERS,
  type SavedReplyPlaceholder,
  type SavedReplyValues,
} from './saved-reply-text.js';

// Fill-in blanks of a saved reply (owner 2026-10-27): «[المبلغ]» in a reply is a blank the sender
// fills when using it, before the text goes into the box (still editable there). The auto
// placeholders {name} / {student} / {assistant} are slots too, prefilled with the known value.

/** A slot of a reply: a «[label]» blank, or an auto placeholder. */
export type ReplySlot =
  | {
      kind: 'blank';
      /** The `values` key: «[label]», or «[]n» for the n-th empty «[ ]». */
      key: string;
      /** Trimmed; '' for an empty «[ ]» (the apps show «قيمة n»). */
      label: string;
      /** 1, 2… for the empty ones in order; null for a labelled blank. */
      n: number | null;
    }
  | { kind: 'auto'; key: SavedReplyPlaceholder };

/** What the sender typed per slot key; an auto slot's key is its placeholder name. */
export type ReplySlotValues = Readonly<Record<string, string | null | undefined>>;

/** A blank: one line, ≤ 40 characters, no braces; never a link «[text](url)». */
const BLANK = /\[([^[\]{}\n]{0,40})\](?!\()/g;
const SLOT = new RegExp(`${BLANK.source}|\\{(name|student|assistant)\\}`, 'g');
/** Marks a blank while the auto placeholders are resolved; never typed by a person. */
const HOLD = '\u0001';
const HELD = new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g');

const blankKey = (label: string, n: number | null): string =>
  n === null ? `[${label}]` : `[]${n}`;

/** Numbers the empty blanks in order of appearance: call once per blank, left to right. */
function blankCounter(): (raw: string) => { key: string; label: string; n: number | null } {
  let empty = 0;
  return (raw) => {
    const label = raw.trim();
    const n = label ? null : (empty += 1);
    return { key: blankKey(label, n), label, n };
  };
}

/**
 * The distinct slots of a reply in order of first appearance: each «[label]» blank (the same label
 * twice is one slot; each empty «[ ]» is its own, numbered) and each auto placeholder used. Pure.
 */
export function replySlots(body: string): ReplySlot[] {
  const slots: ReplySlot[] = [];
  const next = blankCounter();
  for (const m of body.matchAll(SLOT)) {
    const placeholder = SAVED_REPLY_PLACEHOLDERS.find((p) => p === m[2]);
    const slot: ReplySlot = placeholder
      ? { kind: 'auto', key: placeholder }
      : { kind: 'blank', ...next(m[1] ?? '') };
    if (!slots.some((s) => s.key === slot.key)) slots.push(slot);
  }
  return slots;
}

/** True when picking the reply needs the «أكمل الرد» form: a blank, or an auto placeholder with no value. */
export function replyNeedsInput(body: string, known: SavedReplyValues): boolean {
  return replySlots(body).some((s) => s.kind === 'blank' || !known[s.key]?.trim());
}

/**
 * The reply with every slot filled (values trimmed, inserted literally). An empty blank keeps its
 * «[label]» as written, so nothing silently disappears; an empty auto placeholder is removed cleanly
 * (resolveSavedReply's rules). Pure.
 */
export function fillReply(body: string, values: ReplySlotValues): string {
  const blanks: string[] = [];
  const next = blankCounter();
  const held = body.replace(BLANK, (all: string, raw: string) => {
    const value = values[next(raw).key]?.split(HOLD).join('').trim();
    blanks.push(value || all);
    return `${HOLD}${blanks.length - 1}${HOLD}`;
  });
  const auto = { name: values.name, student: values.student, assistant: values.assistant };
  return resolveSavedReply(held, auto).replace(
    HELD,
    (_all: string, i: string) => blanks[Number(i)] ?? '',
  );
}
