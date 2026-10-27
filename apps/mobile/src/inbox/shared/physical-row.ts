// The chat's top bar and typing bar as WhatsApp (owner 2026-10-27 «the layout is reversed»): their
// children are written in PHYSICAL left → right order and stay so in Arabic and English alike, as the
// bubbles do (bubble-side). RN flips row, flex-start/end and start/end under RTL, so the physical
// order is turned back into logical styles here.

export interface PhysicalRow {
  /** The flexDirection that lays the children out left → right, as written. */
  direction: 'row' | 'row-reverse';
  /** The alignItems (in a column) / alignSelf that puts a child on the physical left. */
  left: 'flex-start' | 'flex-end';
  /** The logical edge on the physical left: a margin there, and a chevron pointing left. */
  leftEdge: 'start' | 'end';
}

export function physicalRow(rtl: boolean): PhysicalRow {
  return rtl
    ? { direction: 'row-reverse', left: 'flex-end', leftEdge: 'end' }
    : { direction: 'row', left: 'flex-start', leftEdge: 'start' };
}
