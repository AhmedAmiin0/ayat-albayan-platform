import { isWaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { activeNumberId, overlayNumbers } from '../../../../common/integrations/numbers-overlay';
import { dbError } from '../../../../common/http/http';
import { lineNumbers, loadEnv } from '../../../../config/env/env';
import { currentRows } from '../../../messaging/whatsapp';

/**
 * The academy's CHAT line as E.164 («تواصل معنا للتجديد»), from the configured numbers, never typed in
 * code: in module mode (comms_source) the chat role's default number (wa_numbers.display_phone_e164);
 * under legacy the last good «افحص الخطوط» of the chat line (wa_line_health, kept only while its phone
 * id is still the line's). An academy on one number (no separate chat line) answers on the notifications
 * line, so that number is used then. null when not known yet: the portal then hides the link.
 */
@Injectable()
export class ChatNumber {
  constructor(@Inject(DB) private readonly db: Db) {}

  async e164(): Promise<string | null> {
    return overlayNumbers() === null ? this.legacy() : this.module();
  }

  private async module(): Promise<string | null> {
    const id = activeNumberId('chat') ?? activeNumberId('notifications');
    if (!id) return null;
    const { data, error } = await this.db.from('wa_numbers').select('display_phone_e164').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data?.display_phone_e164 ?? null;
  }

  private async legacy(): Promise<string | null> {
    const { data, error } = await this.db
      .from('wa_line_health')
      .select('line, display_phone_e164, verified_name, checked_at, phone_number_id')
      .in('line', ['chat', 'notifications']);
    if (error) throw dbError(error);
    const rows = currentRows(
      data.flatMap((r) => (isWaLine(r.line) ? [{ ...r, line: r.line }] : [])),
      lineNumbers(loadEnv()),
    );
    return (rows.find((r) => r.line === 'chat') ?? rows.find((r) => r.line === 'notifications'))?.display_phone_e164 ?? null;
  }
}
