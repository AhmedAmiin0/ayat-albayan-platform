import { z } from 'zod';

/** participant_joined / participant_left: who came into or left which room (maybe now empty). */
export interface ParticipantEvent {
  kind: 'joined' | 'left';
  room: string;
  identity: string;
}

const KIND = { participant_joined: 'joined', participant_left: 'left' } as const;

/** LiveKit's WebhookEvent as far as presence reads it (protojson; other fields pass). */
const participantEventSchema = z.object({
  event: z.enum(['participant_joined', 'participant_left']),
  room: z.object({ name: z.string().min(1) }),
  participant: z.object({ identity: z.string().optional() }).optional(),
});

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** participant_joined / participant_left with a room name, else null (every other event). */
export function participantEventOf(event: unknown): ParticipantEvent | null {
  const parsed = participantEventSchema.safeParse(event);
  if (!parsed.success) return null;
  const { event: name, room, participant } = parsed.data;
  return { kind: KIND[name], room: room.name, identity: participant?.identity ?? '' };
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
