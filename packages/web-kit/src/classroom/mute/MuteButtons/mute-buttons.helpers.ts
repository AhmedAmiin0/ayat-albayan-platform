import type { MuteSource } from '@ab/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const M = t.classroom.mute;

export const LABEL: Record<MuteSource, { short: string; of: string; icon: 'mic' | 'cam' }> = {
  microphone: { short: M.mic, of: M.micOf, icon: 'mic' },
  camera: { short: M.cam, of: M.camOf, icon: 'cam' },
};

export const SOURCES: readonly MuteSource[] = ['microphone', 'camera'];
