import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** The author's own reads of message_templates; every write goes through TemplatesRepo (caches). */
@Injectable()
export class TemplateAuthorRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** How many templates this user wrote since `since` (the 5-a-day limit). */
  async createdSince(userId: string, since: Date): Promise<number> {
    const { count, error } = await this.db
      .from('message_templates')
      .select('key', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', since.toISOString());
    if (error) throw new Error(`template count failed: ${error.message}`);
    return count ?? 0;
  }
}
