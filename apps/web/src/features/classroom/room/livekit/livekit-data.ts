import { roleOfMeta } from '@ab/shared';
import { RoomEvent, type Room } from 'livekit-client';
import type { DataPacketIn, DataSendOptions } from '../components/room-types';

/** Reliable data on a topic; `to` limits it to some identities (a sync answer to one late joiner). */
export function sendData(room: Room, bytes: Uint8Array, opts: DataSendOptions): Promise<void> {
  return room.localParticipant.publishData(new Uint8Array(bytes), {
    reliable: true,
    topic: opts.topic,
    ...(opts.to && { destinationIdentities: opts.to }),
  });
}

interface Sender {
  identity: string;
  metadata?: string | undefined;
}

/** Forwards every packet from another participant (server packets without a sender are dropped). */
export function listenData(room: Room, listener: (packet: DataPacketIn) => void): () => void {
  // (payload, participant, kind, topic): the kind and topic arrive as the rest.
  const handler = (payload: Uint8Array, participant?: Sender, ...rest: [unknown?, string?]) => {
    if (!participant) return;
    listener({ bytes: payload, topic: rest[1], from: { identity: participant.identity, role: roleOfMeta(participant.metadata) } });
  };
  room.on(RoomEvent.DataReceived, handler);
  return () => void room.off(RoomEvent.DataReceived, handler);
}
