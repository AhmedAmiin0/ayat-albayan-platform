import { canMute, canMuteAll, canRemove, type JoinRole } from '@ab/schedule';

// Who the teacher (or an admin) may act on in a lesson room from the phone (owner 2026-11-16,
// canvas RoomXTeacher / RoomXEndAll), the web room's rules per person: mute, stop the camera, «كتم
// الجميع», «إخراج من الحلقة», «إنهاء الحلقة للجميع». The writes are lessonRoomSends (lesson-room);
// the API checks the same rules again.

/** One person in the room as the host's list reads them. */
export interface HostPerson {
  identity: string;
  role: JoinRole | null;
  local: boolean;
  micOn: boolean;
  camOn: boolean;
}

const other = (p: HostPerson): boolean => !p.local;

/** «كتم الميكروفون» on this person: someone else, below me, with the microphone on. */
export const mayMuteMic = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && p.micOn && canMute(me, p.role);

/** «إيقاف الكاميرا» on this person: someone else, below me, with the camera on. */
export const mayStopCam = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && p.camOn && canMute(me, p.role);

/** «إخراج من الحلقة»: never oneself, never someone of unknown role. */
export const mayRemove = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && me !== null && p.role !== null && canRemove(me, p.role);

/** «كتم الجميع» mutes every guest whose microphone is on (the web room's rule). */
export const muteAllTargets = (me: JoinRole | null, people: readonly HostPerson[]): HostPerson[] =>
  canMuteAll(me) ? people.filter((p) => p.role === 'guest' && mayMuteMic(me, p)) : [];

/** «إنهاء الحلقة للجميع» is the teacher's or an admin's, like «كتم الجميع». */
export const mayEndForAll = (me: JoinRole | null): boolean => canMuteAll(me);
