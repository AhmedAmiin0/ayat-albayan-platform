// Which side a bubble sits on, as WhatsApp, in RTL and LTR alike:
// ours at the inline-END, the other side's at the START. The language in effect sets
// the direction, so an Arabic phone shows ours on the left and an English phone on the right; RN
// mirrors flex-start/end and start/end itself, so nothing here reads the direction.

export interface BubbleSide {
  /** The alignSelf that puts the bubble on its side. */
  align: 'flex-start' | 'flex-end';
  /** Its outer edge (the screen's edge) as a logical edge: the tail corner. */
  outer: 'start' | 'end';
}

export function bubbleSide(ours: boolean): BubbleSide {
  return { align: ours ? 'flex-end' : 'flex-start', outer: ours ? 'end' : 'start' };
}
