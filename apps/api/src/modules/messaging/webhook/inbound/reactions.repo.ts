import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

@Injectable()
export class ReactionsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Sets their_reaction on the message of that wamid AND phone (a wamid of another chat is never
   * touched); the number of rows it changed. Throws on a database error.
   */
  async setReaction(input: {
    waMessageId: string;
    phone: string;
    emoji: string | null;
  }): Promise<number> {
    const { data, error } = await this.db
      .from('messages')
      .update({ their_reaction: input.emoji })
      .eq('wa_message_id', input.waMessageId)
      .eq('phone_e164', input.phone)
      .select('id');
    if (error) throw pgError(error, { otherwise: (e) => new Error(e.message) });
    return data.length;
  }
}
