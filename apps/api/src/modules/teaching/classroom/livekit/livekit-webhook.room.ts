/** A participant_left event: who left which room (the room may now be empty). */
interface LeftEvent {
  room: string;
  identity: string;
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** participant_left with a room name, else null (every other event). */
export function leftEventOf(event: unknown): LeftEvent | null {
  const e = obj(event);
  if (e?.event !== 'participant_left') return null;
  const room = text(obj(e.room)?.name);
  if (!room) return null;
  return { room, identity: text(obj(e.participant)?.identity) ?? '' };
}

/** ParticipantInfo.kind EGRESS (protojson name, or 2): the recorder itself, not a person. */
const RECORDER_KINDS: ReadonlySet<unknown> = new Set(['EGRESS', 2]);

function personOf(p: unknown, except: string): string | null {
  const x = obj(p);
  const identity = text(x?.identity);
  if (!x || !identity || identity === except || identity.startsWith('EG_') || RECORDER_KINDS.has(x.kind)) return null;
  return identity;
}

/** The people in a ListParticipants answer (recorders and `except`, who just left, left out). */
export function peopleIn(answer: Record<string, unknown>, except = ''): string[] {
  const list: unknown[] = Array.isArray(answer.participants) ? answer.participants : [];
  return list.flatMap((p) => {
    const who = personOf(p, except);
    return who ? [who] : [];
  });
}
