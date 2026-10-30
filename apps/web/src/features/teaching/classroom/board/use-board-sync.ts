import type { JoinRole } from '@ab/shared';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { DataPacketIn, RoomStatus } from '../room/components/room-types';
import type { RoomController } from '../room/livekit/use-room';
import { BOARD_TOPIC, decodeMessage, encodeMessage, syncMessages, type BoardMessage } from './model/messages';
import type { BoardState } from './model/model';
import { shouldAnswerSync, type BoardInput } from './model/reducer';

export interface BoardSyncOptions {
  room: Pick<RoomController, 'sendData' | 'onData'>;
  status: RoomStatus;
  me: { identity: string; role: JoinRole };
  state: RefObject<BoardState>;
  dispatch: (input: BoardInput) => void;
}

export type BoardSend = (msg: BoardMessage, to?: string[]) => void;

/**
 * The board on the data channel (topic `board`, reliable): incoming messages go to the reducer,
 * a sync-request is answered to the asker only, and on connecting we ask once ourselves.
 */
export function useBoardSync({ room, status, me, state, dispatch }: BoardSyncOptions): BoardSend {
  const { sendData, onData } = room;
  const send = useCallback<BoardSend>(
    (msg, to) => sendData(encodeMessage(msg), { topic: BOARD_TOPIC, ...(to && { to }) }),
    [sendData],
  );
  const role = me.role;

  useEffect(() => {
    const handle = (packet: DataPacketIn) => {
      if (packet.topic !== BOARD_TOPIC) return;
      const msg = decodeMessage(packet.bytes);
      if (!msg) return;
      if (msg.t !== 'sync-request') return dispatch({ msg, from: packet.from });
      const now = state.current;
      if (shouldAnswerSync(now, role)) {
        syncMessages(now).forEach((m) => send(m, [packet.from.identity]));
      }
    };
    return onData(handle);
  }, [onData, send, dispatch, state, role]);

  const asked = useRef(false);
  useEffect(() => {
    if (status !== 'connected' || asked.current) return;
    asked.current = true;
    send({ t: 'sync-request' });
  }, [status, send]);

  return send;
}
