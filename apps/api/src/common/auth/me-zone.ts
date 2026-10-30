import { isTimeZone } from '@ab/shared';

// GET /auth/me `tz` (docs/34 §2): the signed-in person's own zone, which every screen reads times
// in before the device's. Pure.

/** profiles.tz's column default (migration 0002): on every staff row until someone picks one. */
export const PROFILE_DEFAULT_TZ = 'Asia/Riyadh';

/** The zones stored for one profile: its teacher row, its guardian row and the profile itself. */
export interface MeZoneRows {
  teacher: string | null;
  guardian: string | null;
  profile: string | null;
}

/**
 * A teacher's or guardian's tz (always picked); else the profile's, unless it is still the column
 * default, which nobody chose (an Egyptian assistant's device zone must win over it).
 */
export function personZone(rows: MeZoneRows): string | null {
  const picked = [rows.teacher, rows.guardian].find(isZone);
  if (picked) return picked;
  return isZone(rows.profile) && rows.profile !== PROFILE_DEFAULT_TZ ? rows.profile : null;
}

const isZone = (tz: string | null): tz is string => !!tz && isTimeZone(tz);
