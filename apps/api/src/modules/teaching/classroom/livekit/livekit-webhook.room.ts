import { z } from 'zod';

/**
 * participant_joined / participant_left / room_finished: who came into or left which room (maybe
 * now empty), at the event's own time (createdAt; null when LiveKit sent none).
 */
export interface ParticipantEvent {
  kind: 'joined' | 'left' | 'finished';
  room: string;
  identity: string;
  at: string | null;
}

const KIND = {
  participant_joined: 'joined',
  participant_left: 'left',
  room_finished: 'finished',
} as const;

const S_MS = 1000;

/** WebhookEvent.createdAt: Unix seconds (protojson int64: a string, or a number). */
const createdAtSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]);

/** LiveKit's WebhookEvent as far as presence reads it (protojson; other fields pass). */
const participantEventSchema = z.object({
  event: z.enum(['participant_joined', 'participant_left', 'room_finished']),
  room: z.object({ name: z.string().min(1) }),
  participant: z.object({ identity: z.string().optional() }).optional(),
  createdAt: createdAtSchema.optional(),
});

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

const isoOf = (seconds: string | number | undefined): string | null =>
  seconds === undefined || Number(seconds) === 0 ? null : new Date(Number(seconds) * S_MS).toISOString();

/** A participant or room_finished event with a room name, else null (every other event). */
export function participantEventOf(event: unknown): ParticipantEvent | null {
  const parsed = participantEventSchema.safeParse(event);
  if (!parsed.success) return null;
  const { event: name, room, participant, createdAt } = parsed.data;
  const identity = participant?.identity ?? '';
  return { kind: KIND[name], room: room.name, identity, at: isoOf(createdAt) };
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
