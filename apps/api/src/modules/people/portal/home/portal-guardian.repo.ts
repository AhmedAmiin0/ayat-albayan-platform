import type { PortalGuardian } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';

const guardianRow = z.object({ name: z.string(), phone_e164: z.string() });

/** Only the guardian login's own name and number cross the wire. */
@Injectable()
export class PortalGuardianRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** null without a guardian row, or on a failed read (the page keeps its role word then). */
  async ownOf(profileId: string): Promise<PortalGuardian | null> {
    try {
      const { data } = await this.db
        .from('guardians')
        .select('name, phone_e164')
        .eq('profile_id', profileId)
        .maybeSingle();
      const parsed = guardianRow.safeParse(data);
      return parsed.success ? { name: parsed.data.name, phone: parsed.data.phone_e164 } : null;
    } catch {
      return null;
    }
  }
}
