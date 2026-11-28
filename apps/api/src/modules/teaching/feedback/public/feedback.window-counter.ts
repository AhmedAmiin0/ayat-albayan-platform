import { SETTING_DEFAULTS } from '@ab/settings';

export const MIN_MS = 60_000;
/**
 * The registry default (10 min): join and activity limits keep it; the feedback form reads the
 * setting.
 */
export const WINDOW_MS = SETTING_DEFAULTS.feedback_rate_window_min * MIN_MS;
const SWEEP_AT = 10_000;

/**
 * Sliding-window counter. ponytail: in memory, per API instance. The hard guard against a double
 * answer is the unique row + `submitted_at is null` update; this only slows hammering. Move to a
 * DB or Redis counter if the API ever runs on more than one instance.
 */
export class WindowCounter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly max: number) {}

  allow(key: string, now: number, windowMs = WINDOW_MS): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    this.hits.set(key, [...recent, now]);
    if (this.hits.size > SWEEP_AT) this.sweep(now, windowMs);
    return true;
  }

  private sweep(now: number, windowMs: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= windowMs)) this.hits.delete(key);
    }
  }
}
