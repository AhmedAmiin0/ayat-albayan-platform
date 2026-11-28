import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { rows } from '@/common/db/errors';

export interface ReadMark {
  profile_id: string;
  last_read_at: string;
}

/** channel_reads of one channel (service role; the caller was let in by ChannelAccess). */
@Injectable()
export class ChannelReadsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every participant's read mark in this channel (the primary key's prefix). */
  async marks(channelId: string): Promise<ReadMark[]> {
    const data = rows(
      await this.db
        .from('channel_reads')
        .select('profile_id, last_read_at')
        .eq('channel_id', channelId),
    );
    return data;
  }
}
