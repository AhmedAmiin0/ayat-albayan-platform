import type { NumberView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

const a = t.numbers.actions;

/** An Evolution number whose webhook is not read back as pushed: nothing inbound would arrive. */
const hookUnsynced = (view: NumberView): boolean =>
  view.evolution !== null && view.evolution.sync?.parts.webhook !== 'synced';

/**
 * What enable / disable must ask first (null = nothing): turning off a role's default, or
 * (review fix 8) turning on an Evolution number whose webhook is not synced.
 */
export function toggleAsk(view: NumberView): string | null {
  const asks: readonly { when: boolean; text: string }[] = [
    { when: view.enabled && view.is_default, text: a.confirmDisableDefault },
    { when: !view.enabled && hookUnsynced(view), text: a.confirmEnableUnsynced },
  ];
  return asks.find((x) => x.when)?.text ?? null;
}
