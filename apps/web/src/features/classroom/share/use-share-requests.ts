import { canGrantShare, type JoinRole } from '@ab/shared';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { classroomErrorText } from '../errors';
import type { TileView } from '../room-types';
import type { RoomController } from '../use-room';
import type { GrantShare } from './share-api';
import { decodeShare, EMPTY_SHARE, encodeShare, SHARE_TOPIC, shareReducer, type ShareMessage, type ShareState } from './share-messages';

export interface ShareRequests {
  /** Staff: may answer requests and stop a guest's share. */
  canGrant: boolean;
  /** Staff: guests waiting for an answer (their camera tiles). */
  pending: TileView[];
  /** Staff: guests allowed to share now («إيقاف مشاركة {name}»). */
  granted: TileView[];
  mine: ShareState['mine'];
  notice: string | null;
  request: () => void;
  allow: (tile: TileView) => void;
  deny: (tile: TileView) => void;
  revoke: (tile: TileView) => void;
  dismiss: () => void;
}

export interface ShareRequestOptions {
  room: RoomController;
  role: JoinRole;
  /** The API call behind «سماح» (null: a room with no such route, nothing to grant). */
  grant: GrantShare | null;
}

const cameraTiles = (tiles: TileView[]) => tiles.filter((x) => x.kind === 'camera' && !x.isLocal);

/** «اطلب مشاركة الشاشة» → staff «سماح» (LiveKit permission via the API) / «رفض» (data message). */
export function useShareRequests({ room, role, grant }: ShareRequestOptions): ShareRequests {
  const [state, dispatch] = useReducer(shareReducer, EMPTY_SHARE);
  const [notice, setNotice] = useState<string | null>(null);
  const { snap, sendData, onData } = room;
  const me = snap.tiles.find((x) => x.isLocal)?.identity ?? '';
  const send = useCallback((msg: ShareMessage) => sendData(encodeShare(msg), { topic: SHARE_TOPIC }), [sendData]);

  useEffect(
    () =>
      onData((packet) => {
        if (packet.topic !== SHARE_TOPIC) return;
        const msg = decodeShare(packet.bytes);
        if (msg) dispatch({ kind: 'message', msg, from: packet.from, me });
      }),
    [onData, me],
  );

  // A guest's permission flipping on is the «سماح» itself (LiveKit ParticipantPermissionsChanged).
  const allowedBefore = useRef(snap.shareAllowed);
  useEffect(() => {
    if (snap.shareAllowed && !allowedBefore.current && role === 'guest') {
      dispatch({ kind: 'granted' });
      setNotice(t.classroom.shareRequest.allowed);
    }
    allowedBefore.current = snap.shareAllowed;
  }, [snap.shareAllowed, role]);
  useEffect(() => {
    if (state.mine === 'denied') setNotice(t.classroom.shareRequest.denied);
  }, [state.mine]);

  const canGrant = grant !== null && canGrantShare(role, 'guest');
  const others = cameraTiles(snap.tiles);
  const call = (tile: TileView, allow: boolean) => {
    dispatch({ kind: 'settled', identity: tile.identity });
    grant?.({ identity: tile.identity, allow }).catch((e: unknown) => setNotice(classroomErrorText(e)));
  };

  return {
    canGrant,
    pending: canGrant ? others.filter((x) => state.pending.includes(x.identity) && !x.shareAllowed) : [],
    granted: canGrant ? others.filter((x) => x.role === 'guest' && x.shareAllowed) : [],
    mine: state.mine,
    notice,
    request: () => {
      setNotice(null);
      dispatch({ kind: 'asked' });
      send({ t: 'request' });
    },
    allow: (tile) => call(tile, true),
    deny: (tile) => {
      dispatch({ kind: 'settled', identity: tile.identity });
      send({ t: 'deny', who: tile.identity });
    },
    revoke: (tile) => call(tile, false),
    dismiss: () => setNotice(null),
  };
}
