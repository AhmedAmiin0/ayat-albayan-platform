import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

/** messages read for OwnNumbers: the inbound traffic of our own numbers. */
@Injectable()
export class OwnTrafficRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async inboundSince(phones: readonly string[], since: string): Promise<number> {
    const { count, error } = await this.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .in('phone_e164', [...phones])
      .gte('created_at', since);
    if (error) throw pgError(error);
    return count ?? 0;
  }
}
