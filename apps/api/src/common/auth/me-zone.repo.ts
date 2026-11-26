import { LOCALES, type Locale } from '@ab/core';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { done } from '@/common/db/errors';
import { personZone } from './me-zone';

type TzRead = PromiseLike<{ data: { tz: string | null } | null; error: unknown }>;

const tzOf = async (read: TzRead): Promise<string | null> => {
  const { data, error } = await read;
  return error ? null : (data?.tz ?? null);
};

/** profiles.locale is free text in the DB: only a language the apps speak counts. */
const localeRow = z.object({ locale: z.enum(LOCALES) });

/** The signed-in person's zone and language for the me endpoints and locale write (docs/34 §2). */
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

  /** profiles.locale ('ar' | 'en'); null when unknown or unreadable (the app keeps its own). */
  async localeOf(profileId: string): Promise<Locale | null> {
    try {
      const { data } = await this.db.from('profiles').select('locale').eq('id', profileId).maybeSingle();
      const parsed = localeRow.safeParse(data);
      return parsed.success ? parsed.data.locale : null;
    } catch {
      return null;
    }
  }

  /** Writes the login's own language. */
  async setLocale(profileId: string, locale: Locale): Promise<void> {
    done(await this.db.from('profiles').update({ locale }).eq('id', profileId));
  }
}
