import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** What a correction reads of the message it corrects. */
export interface CorrectionTarget {
  id: string;
  phone_e164: string;
  direction: string;
  status: string;
  body: string | null;
  media_mime: string | null;
  template_key: string | null;
  interactive_payload: unknown;
  wa_message_id: string | null;
  hidden_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
}

const TARGET_SELECT =
  'id, phone_e164, direction, status, body, media_mime, template_key, interactive_payload, wa_message_id, hidden_at, deleted_at, created_by' as const;

/** «تعديل» (owner 2026-11-07): the corrected message, read only (it is never changed). */
@Injectable()
export class CorrectionRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async target(id: string): Promise<CorrectionTarget | null> {
    const { data, error } = await this.db
      .from('messages')
      .select(TARGET_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`correction target read failed: ${error.message}`);
    return data;
  }
}
