import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { conflict } from '@/common/http/errors';
import { pgError } from '@/common/db/errors';
import type { TestTarget } from './test-accounts.schemas';

export interface TestFlagWrite {
  kind: TestTarget;
  id: string;
  isTest: boolean;
  actorId: string;
}

const flippedSchema = z
  .object({ id: z.uuid(), is_test: z.boolean(), profiles: z.array(z.uuid()) })
  .nullable();
type Flipped = NonNullable<z.infer<typeof flippedSchema>>;

/** 23514 test_family_mismatch: a family login would link to a student of the other kind. */
const MISMATCH = '23514';

/**
 * set_test_flag (migration 20261117140100, service role): flips the family with its audit row in
 * one transaction. null = no such student / profile.
 */
@Injectable()
export class TestAccountsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async set(write: TestFlagWrite): Promise<Flipped | null> {
    const { data, error } = await this.db.rpc('set_test_flag', {
      p_kind: write.kind,
      p_id: write.id,
      p_is_test: write.isTest,
      p_actor: write.actorId,
    });
    if (error?.code === MISMATCH) throw conflict('test_family_mismatch');
    if (error) throw pgError(error);
    return flippedSchema.parse(data);
  }
}
