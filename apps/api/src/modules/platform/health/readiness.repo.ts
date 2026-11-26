import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

/** The readiness probe's one query: one row of roles (tiny, never empty), cut off in time. */
@Injectable()
export class ReadinessRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async ping(timeoutMs: number): Promise<void> {
    const signal = AbortSignal.timeout(timeoutMs);
    const { error } = await this.db.from('roles').select('id').limit(1).abortSignal(signal);
    if (error) throw pgError(error);
  }
}
