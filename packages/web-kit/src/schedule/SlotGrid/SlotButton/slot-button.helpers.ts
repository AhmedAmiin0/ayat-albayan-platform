const SLOT_LOOK = {
  picked:
    'border-lapis bg-accent font-semibold text-ink shadow-[0_0_0_2px_color-mix(in_oklab,var(--lapis)_22%,transparent)]',
  busy: 'border-dashed border-rule-strong text-ink-3 hover:bg-sunk',
  free: 'border-input bg-raised text-ink hover:bg-sunk',
} as const;

/** Picked wins; else a start with conflicts reads busy (dashed), else free. */
export function slotLook(picked: boolean, busy: boolean): string {
  if (picked) return SLOT_LOOK.picked;
  return busy ? SLOT_LOOK.busy : SLOT_LOOK.free;
}
