import type { WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';

function check(error: PostgrestError | null): void {
  if (error) throw new Error(`db: ${error.message}`);
}

/** Where the catch-up looks: the number's rows, else (legacy, no wa_numbers row) the line's. */
interface InboundScope {
  line: WaLine;
  numberId: string | null;
}

const timeOf = (row: { created_at: string } | null): Date | null =>
  row ? new Date(row.created_at) : null;

/** The inbound catch-up's reads (external/inbound); the rules live in InboundCatchUp. */
@Injectable()
export class InboundCatchUpRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The newest family message stored on this number (any way it came); null when none. */
  async newestInbound(scope: InboundScope): Promise<Date | null> {
    let query = this.db.from('messages').select('created_at').eq('direction', 'inbound');
    query = scope.numberId ? query.eq('number_id', scope.numberId) : query.eq('line', scope.line);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    check(error);
    return timeOf(data);
  }

  /**
   * The newest reply staff sent this phone outside the app (Kapso's inbox: outbound, created_by
   * null, attempts 0, with a wamid, as ExternalQueries.newestExternal); null when none.
   */
  async lastExternalReply(phone: string): Promise<Date | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('created_at')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .is('created_by', null)
      .eq('attempts', 0)
      .not('wa_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    check(error);
    return timeOf(data);
  }
}
