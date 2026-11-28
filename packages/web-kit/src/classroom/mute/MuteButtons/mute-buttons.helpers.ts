import type { MuteSource } from '@ab/schedule';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const M = t.classroom.mute;

export const LABEL: Record<MuteSource, { short: string; of: string; icon: 'mic' | 'cam' }> = {
  microphone: { short: M.mic, of: M.micOf, icon: 'mic' },
  camera: { short: M.cam, of: M.camOf, icon: 'cam' },
};

const SOURCES: readonly MuteSource[] = ['microphone', 'camera'];

/** The tracks of this person I may mute, microphone first. */
export const mutableSources = (tile: TileView, mute: MuteController): MuteSource[] =>
  SOURCES.filter((s) => mute.canMute(tile, s));
