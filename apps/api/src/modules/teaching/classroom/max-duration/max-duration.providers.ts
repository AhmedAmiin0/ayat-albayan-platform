import { MaxDurationRepo } from './max-duration.repo';
import { MaxDurationSettings } from './max-duration.settings';
import { MeetingAutoEnd } from './meeting-auto-end';
import { MeetingMaxDurationJob } from './meeting-max-duration.job';
import { RoomCloser } from './room-closer';

/** settings.meeting_max_minutes: the job that closes meetings and rooms open too long. */
export const MAX_DURATION_PROVIDERS = [
  MaxDurationRepo,
  MaxDurationSettings,
  MeetingAutoEnd,
  RoomCloser,
  MeetingMaxDurationJob,
];
