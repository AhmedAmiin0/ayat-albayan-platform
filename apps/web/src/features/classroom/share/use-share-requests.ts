import { canGrantShare, type JoinRole } from '@ab/shared';
import { useCallback, useEffect, useReducer, useState } from 'react';
import type { BoardController } from '../board/use-board';
import { classroomErrorText } from '../errors';
import type { TileView } from '../room-types';
import type { RoomController } from '../use-room';
import { REQUEST_TEXT } from './request-text';
import type { GrantShare } from './share-api';
import {
  decodeShare,
  EMPTY_SHARE,
  encodeShare,
  REQUEST_KINDS,
  SHARE_TOPIC,
  shareReducer,
  type RequestKind,
  type ShareMessage,
  type ShareState,
} from './share-messages';
import { useGrantNotices } from './use-grant-notices';

export interface PendingView {
  tile: TileView;
  what: RequestKind;
}

export interface ShareRequests {
  /** Staff: may answer requests, stop a guest's share or writing. */
  canGrant: boolean;
  /** A guest: may ask (only a guest's request counts). */
  canRequest: boolean;
  /** Staff: guests waiting for an answer, with what they ask for. */
  pending: PendingView[];
  /** Staff: guests allowed to share now («إيقاف مشاركة {name}»). */
  granted: TileView[];
  /** Staff: guests allowed by name to write on the board («إيقاف كتابة {name}»). */
  drawers: TileView[];
  mine: ShareState['mine'];
  notice: string | null;
  request: (what: RequestKind) => void;
  allow: (p: PendingView) => void;
  deny: (p: PendingView) => void;
  revoke: (tile: TileView) => void;
  revokeDraw: (tile: TileView) => void;
  dismiss: () => void;
}

export interface ShareRequestOptions {
  room: RoomController;
  role: JoinRole;
  /** The API call behind the screen's «سماح» (null: a room with no such route). */
  grant: GrantShare | null;
  board: BoardController;
}

const others = (tiles: TileView[]) => tiles.filter((x) => x.kind === 'camera' && !x.isLocal);

/** «اطلب مشاركة الشاشة / الكتابة على السبورة / فتح السبورة» → staff «سماح» / «رفض» (data message). */
export function useShareRequests({ room, role, grant, board }: ShareRequestOptions): ShareRequests {
  const [state, dispatch] = useReducer(shareReducer, EMPTY_SHARE);
  const [notice, setNotice] = useState<string | null>(null);
  const { snap, sendData, onData } = room;
  const me = snap.tiles.find((x) => x.isLocal)?.identity ?? '';
  const send = useCallback((msg: ShareMessage) => sendData(encodeShare(msg), { topic: SHARE_TOPIC }), [sendData]);
  useEffect(
    () =>
      onData((packet) => {
        const msg = packet.topic === SHARE_TOPIC ? decodeShare(packet.bytes) : null;
        if (msg) dispatch({ kind: 'message', msg, from: packet.from, me });
      }),
    [onData, me],
  );
  useGrantNotices({ flags: { screen: snap.shareAllowed, draw: board.canDraw, open: board.state.open }, mine: state.mine, dispatch, setNotice });

  const { studentsCanDraw, allowed, open } = board.state;
  const answered: Record<RequestKind, (tile: TileView) => boolean> = {
    screen: (x) => x.shareAllowed,
    draw: (x) => studentsCanDraw || allowed.includes(x.identity),
    open: () => open,
  };
  const canGrant = canGrantShare(role, 'guest');
  const people = others(snap.tiles);
  const pending = state.pending.flatMap(({ identity, what }) => {
    const tile = people.find((x) => x.identity === identity);
    return tile && !answered[what](tile) && (what !== 'screen' || grant) ? [{ tile, what }] : [];
  });
  const settle = (identity: string, what: RequestKind) => dispatch({ kind: 'settled', identity, what });
  const share = (tile: TileView, on: boolean) => {
    settle(tile.identity, 'screen');
    grant?.({ identity: tile.identity, allow: on }).catch((e: unknown) => setNotice(classroomErrorText(e)));
  };
  const deniedKind = REQUEST_KINDS.find((k) => state.mine[k] === 'denied');

  return {
    canGrant,
    canRequest: role === 'guest',
    pending: canGrant ? pending : [],
    granted: canGrant && grant ? people.filter((x) => x.role === 'guest' && x.shareAllowed) : [],
    drawers: canGrant ? people.filter((x) => x.role === 'guest' && allowed.includes(x.identity)) : [],
    mine: state.mine,
    notice: notice ?? (deniedKind ? REQUEST_TEXT[deniedKind].denied : null),
    request: (what) => {
      setNotice(null);
      dispatch({ kind: 'asked', what });
      send({ t: 'request', what });
    },
    allow: ({ tile, what }) => {
      if (what === 'screen') return share(tile, true);
      settle(tile.identity, what);
      if (what === 'draw') board.allowDrawer(tile.identity, true);
      else board.openForAll();
    },
    deny: ({ tile, what }) => {
      settle(tile.identity, what);
      send({ t: 'deny', who: tile.identity, what });
    },
    revoke: (tile) => share(tile, false),
    revokeDraw: (tile) => board.allowDrawer(tile.identity, false),
    dismiss: () => {
      setNotice(null);
      dispatch({ kind: 'dismissed' });
    },
  };
}
