import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { personZone } from './me-zone';

type TzRead = PromiseLike<{ data: { tz: string | null } | null; error: unknown }>;

const tzOf = async (read: TzRead): Promise<string | null> => {
  const { data, error } = await read;
  return error ? null : (data?.tz ?? null);
};

/** Reads the signed-in person's zone for GET /auth/me (docs/34 §2). */
@Injectable()
export class MeZoneRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Their own tz, or null; a failed read is null too (the device's zone then applies). */
  async zoneOf(profileId: string): Promise<string | null> {
    try {
      const [teacher, guardian, profile] = await Promise.all([
        tzOf(this.db.from('teachers').select('tz').eq('profile_id', profileId).maybeSingle()),
        tzOf(this.db.from('guardians').select('tz').eq('profile_id', profileId).maybeSingle()),
        tzOf(this.db.from('profiles').select('tz').eq('id', profileId).maybeSingle()),
      ]);
      return personZone({ teacher, guardian, profile });
    } catch {
      return null;
    }
  }
}
