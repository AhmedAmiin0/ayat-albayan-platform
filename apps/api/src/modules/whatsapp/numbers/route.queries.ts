import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { Approvals } from './number-route';
import type { TemplateRow } from '../whatsapp.types';

/** Template keys are snake_case registry keys; anything else is never put into a filter. */
const KEY = /^[a-z0-9_]{1,64}$/;

/**
 * Module mode's reads for routing per number (docs/23c). Only MessageSender's numbers pass calls them:
 * under legacy (comms_source = legacy, staging) neither is ever read.
 */
@Injectable()
export class RouteQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every message_template_numbers row as key → number → status (decision 4). */
  async approvals(): Promise<Approvals> {
    const { data, error } = await this.db.from('message_template_numbers').select('template_key, number_id, status');
    if (error) throw new Error(`template approvals read failed: ${error.message}`);
    const out = new Map<string, Map<string, string>>();
    for (const r of data) out.set(r.template_key, (out.get(r.template_key) ?? new Map<string, string>()).set(r.number_id, r.status));
    return out;
  }

  /** Registry rows approved on the role's WABA (message_templates.status) or on some number. */
  async templates(approvals: Approvals): Promise<TemplateRow[]> {
    const keys = [...approvals].filter(([key, by]) => KEY.test(key) && [...by.values()].includes('approved')).map(([key]) => key);
    const onNumber = keys.length ? `,key.in.(${keys.join(',')})` : '';
    const { data, error } = await this.db.from('message_templates').select('*').or(`status.eq.approved${onNumber}`);
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return data;
  }
}
