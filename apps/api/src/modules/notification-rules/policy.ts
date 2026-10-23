import { NOTIFICATION_CATALOGUE, notificationEntry, resolveRule, type EffectiveRule, type NotificationChannel, type NotificationKey } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RulesReader, type RulesSnapshot } from './rules.reader';

/** A row as producers see it when the rules cannot be read: off (fail closed), except locked rows. */
function closed(key: NotificationKey): EffectiveRule {
  const entry = notificationEntry(key);
  return { enabled: entry.locked, channels: [...entry.channels], timing: null, number_id: null };
}

/**
 * What every producer asks before it queues or pushes (docs/23 §2c): is the row on, through which
 * channels, with which timing and number. The choices come from resolveRule (legacy settings while
 * comms_source = legacy, notification_rules when module). Never throws: a failed read is logged and
 * reads as OFF for this pass (fail closed; jobs retry on their next tick), locked rows stay on.
 * The send gate (messaging_enabled, auto_messages_enabled) is NOT decided here: the sender owns it.
 */
@Injectable()
export class NotificationPolicy {
  private readonly log = new Logger(NotificationPolicy.name);

  constructor(private readonly reader: RulesReader) {}

  /** Every key's effective rule, from one snapshot (null when unreadable). */
  async snapshot(): Promise<RulesSnapshot | null> {
    try {
      return await this.reader.snapshot();
    } catch (e) {
      this.log.warn(`notification rules unread (producers hold): ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /** Every catalogue row's effective rule from one snapshot (each one closed when unreadable), and that snapshot. */
  async all(): Promise<{ snapshot: RulesSnapshot | null; rules: Map<NotificationKey, EffectiveRule> }> {
    const snap = await this.snapshot();
    const rules = new Map<NotificationKey, EffectiveRule>(
      NOTIFICATION_CATALOGUE.map((e) => [
        e.key,
        snap ? resolveRule(e, { mode: snap.mode, row: snap.rows.get(e.key) ?? null, settings: snap.settings }) : closed(e.key),
      ]),
    );
    return { snapshot: snap, rules };
  }

  async rule(key: NotificationKey): Promise<EffectiveRule> {
    const snap = await this.snapshot();
    if (!snap) return closed(key);
    return resolveRule(notificationEntry(key), { mode: snap.mode, row: snap.rows.get(key) ?? null, settings: snap.settings });
  }

  async isOn(key: NotificationKey): Promise<boolean> {
    return (await this.rule(key)).enabled;
  }

  /** On AND the channel is among its effective channels. */
  async channelOn(key: NotificationKey, channel: NotificationChannel): Promise<boolean> {
    const r = await this.rule(key);
    return r.enabled && r.channels.includes(channel);
  }
}
