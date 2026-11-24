import { canMute, canMuteAll, canRemove, type JoinRole } from '@ab/schedule';

// The API checks the same host rules again.

/** One person in the room as the host's list reads them. */
export interface HostPerson {
  identity: string;
  role: JoinRole | null;
  local: boolean;
  micOn: boolean;
  camOn: boolean;
}

const other = (p: HostPerson): boolean => !p.local;

/** Only someone else, below my role, with the microphone on. */
export const mayMuteMic = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && p.micOn && canMute(me, p.role);

/** Only someone else, below my role, with the camera on. */
export const mayStopCam = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && p.camOn && canMute(me, p.role);

/** Never oneself and never someone of unknown role. */
export const mayRemove = (me: JoinRole | null, p: HostPerson): boolean =>
  other(p) && me !== null && p.role !== null && canRemove(me, p.role);

/** Mutes every guest whose microphone is on. */
export const muteAllTargets = (me: JoinRole | null, people: readonly HostPerson[]): HostPerson[] =>
  canMuteAll(me) ? people.filter((p) => p.role === 'guest' && mayMuteMic(me, p)) : [];

/** Ending for all is the teacher's or an admin's, like mute all. */
export const mayEndForAll = (me: JoinRole | null): boolean => canMuteAll(me);
