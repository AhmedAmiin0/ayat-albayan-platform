import { liveRoomText, type LiveRoom, type LiveRoomText } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

/** A live room in the family's words (@ab/client-core liveRoomText over t.portal.app.live). */
export const liveText = (live: LiveRoom): LiveRoomText => liveRoomText(live, t.portal.app.live);
