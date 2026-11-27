import { PLAYER_SPEEDS, speedLabel, type PlayerSpeed } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { SpeedKey } from './PlayerButtons.types';

export const P = t.audioPlayer;

export const SPEEDS = PLAYER_SPEEDS.map((s) => ({ value: `${s}` as const, label: speedLabel(s) }));

export const SPEED_OF = Object.fromEntries(PLAYER_SPEEDS.map((s) => [`${s}`, s])) as Record<
  SpeedKey,
  PlayerSpeed
>;
