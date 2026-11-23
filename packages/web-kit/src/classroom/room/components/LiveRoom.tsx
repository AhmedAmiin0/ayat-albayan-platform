import type { RoomJoinResult } from '@ab/shared';
import { BoardStage } from '#/classroom/board/BoardStage.tsx';
import { ControlBar, type ChatControl } from './ControlBar';
import { STAFF_KIT, type RoomKit } from '#/classroom/flow/room-kit.ts';
import { RoomMain } from '#/classroom/flow/RoomMain.tsx';
import { RoomOverlays } from '#/classroom/flow/RoomOverlays.tsx';
import { isAlone, roomLayout } from '#/classroom/flow/spotlight.ts';
import { useRoomTools } from '#/classroom/flow/use-room-tools.tsx';
import { useRoomUi, type RoomPanelName, type RoomUi } from '#/classroom/flow/use-room-ui.ts';
import { PeopleList } from '#/classroom/panel/PeopleList.tsx';
import { RoomPanel, type PanelTab } from '#/classroom/panel/RoomPanel.tsx';
import { RoomTop } from './RoomTop';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';

interface Props {
  room: RoomController;
  join: RoomJoinResult;
  /** The variant and what the page passed (staff by default). */
  kit?: RoomKit;
}

const PANEL_TAB: Readonly<Record<RoomPanelName, PanelTab | null>> = {
  chat: 'chat',
  people: 'people',
  recordings: null,
};

const chatControl = (kit: RoomKit, ui: RoomUi): ChatControl | undefined =>
  kit.chat
    ? { unread: kit.chat.unread, on: ui.panel === 'chat', open: () => ui.toggle('chat') }
    : undefined;

/**
 * The call itself, one screen tall: the top line, the stage (or the grid, or «بانتظار المعلم/ة…»)
 * with the family's chat / people panel beside it, and the control bar pinned at the bottom. The
 * board, «إخراج من الحلقة» and «التسجيلات» hang off it by role (an internal meeting's room too). A
 * trial lesson's room has no text chat (join.chat false; the data hook drops the chat topic).
 */
export function LiveRoom({ room, join, kit = STAFF_KIT }: Props) {
  const { snap } = room;
  const tools = useRoomTools(room, join);
  const ui = useRoomUi(kit.features, room.leave);
  const { board, share } = tools;
  const layout = roomLayout(snap.tiles, board.visible, kit.features.spotlightTeacher);
  const tab = ui.panel === null ? null : PANEL_TAB[ui.panel];
  const people = snap.tiles.filter((x) => x.kind === 'camera').length;
  const waiting = kit.features.waitStage && isAlone(snap.tiles);
  return (
    <main className="flex h-dvh flex-col gap-2 overflow-hidden bg-page px-3 pt-3 sm:gap-3 sm:px-4 sm:pt-4">
      <RoomTop room={room} join={join} kit={kit} share={share} onPeople={() => ui.open('people')} />
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RoomMain
            layout={layout}
            tiles={snap.tiles}
            slots={tools.slots}
            board={<BoardStage board={board} room={room} requests={share} />}
            waiting={{ on: waiting, note: kit.context?.waiting }}
            wideStrip={kit.features.wideStrip}
          />
        </div>
        {kit.features.sidePanel && tab && (
          <RoomPanel
            tab={tab}
            onTab={ui.open}
            onClose={ui.close}
            chat={kit.chat}
            count={people}
            people={<PeopleList tiles={snap.tiles} variant={kit.variant} />}
          />
        )}
      </div>
      <ControlBar
        room={room}
        board={board}
        role={join.role}
        share={share}
        onPeople={ui.people}
        onRecordings={tools.recordingsFor === null ? undefined : () => ui.open('recordings')}
        chat={chatControl(kit, ui)}
        onLeave={ui.leave}
        round={kit.features.roundControls}
      />
      <RoomOverlays room={room} kit={kit} tools={tools} ui={ui} />
    </main>
  );
}
