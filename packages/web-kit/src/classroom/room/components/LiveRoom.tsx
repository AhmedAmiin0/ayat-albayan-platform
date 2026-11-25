import type { RoomJoinResult } from '@ab/schedule';
import { BoardStage } from '@ab/web-kit/classroom/board/BoardStage';
import { ControlBar, type ChatControl } from './ControlBar';
import { STAFF_KIT, type RoomKit } from '@ab/web-kit/classroom/flow/room-kit';
import { RoomMain } from '@ab/web-kit/classroom/flow/RoomMain';
import { RoomOverlays } from '@ab/web-kit/classroom/flow/RoomOverlays';
import { isAlone, roomLayout } from '@ab/web-kit/classroom/flow/spotlight';
import { useRoomTools } from '@ab/web-kit/classroom/flow/use-room-tools';
import { useRoomUi, type RoomPanelName, type RoomUi } from '@ab/web-kit/classroom/flow/use-room-ui';
import { PeopleList } from '@ab/web-kit/classroom/panel/PeopleList';
import { RoomPanel, type PanelTab } from '@ab/web-kit/classroom/panel/RoomPanel';
import { RoomTop } from './RoomTop';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';

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

/** A trial lesson's room has no text chat (join.chat false). */
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
