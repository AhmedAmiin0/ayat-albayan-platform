// Which side a bubble sits on (owner 2026-10-26 «make it like WhatsApp»): ours on the physical
// right, the family's on the physical left, in Arabic and English alike. RN flips flex-start/end and
// start/end under RTL, so the physical side is turned back into logical styles here.

export interface BubbleSide {
  side: 'left' | 'right';
  /** The alignSelf that puts the bubble on that side. */
  align: 'flex-start' | 'flex-end';
  /** Its outer edge (the screen's edge) as a logical edge: the tail corner and the swipe icon. */
  outer: 'start' | 'end';
  /** Which way (translateX sign) a swipe toward the screen's centre goes, as WhatsApp answers. */
  toCentre: 1 | -1;
}

export function bubbleSide(ours: boolean, rtl: boolean): BubbleSide {
  // The inline-end is the right in English and the left in Arabic.
  const atEnd = ours !== rtl;
  return {
    side: ours ? 'right' : 'left',
    align: atEnd ? 'flex-end' : 'flex-start',
    outer: atEnd ? 'end' : 'start',
    toCentre: ours ? -1 : 1,
  };
}
