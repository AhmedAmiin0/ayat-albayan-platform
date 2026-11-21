import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** The readiness probe's one query: a single settings key, cut off after `timeoutMs`. */
@Injectable()
export class ReadinessRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async ping(timeoutMs: number): Promise<void> {
    const signal = AbortSignal.timeout(timeoutMs);
    const { error } = await this.db.from('settings').select('key').limit(1).abortSignal(signal);
    if (error) throw new Error(error.message);
  }
}
