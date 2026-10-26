import { SETTING_DEFAULTS } from '@ab/shared';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { FeedbackSettings } from '../feedback.settings';

const MIN_MS = 60_000;
/** The registry default (10 min): join and activity limits keep it; the feedback form reads the setting. */
const WINDOW_MS = SETTING_DEFAULTS.feedback_rate_window_min * MIN_MS;
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

export type LimitCall = { ip: string; token: string; windowMs?: number };

/**
 * The public form's limit: 10 requests per token and IP, 60 per IP, each per
 * settings.feedback_rate_window_min (10 minutes by default).
 */
export class PublicFeedbackLimit {
  private readonly perToken = new WindowCounter(10);
  private readonly perIp = new WindowCounter(60);

  constructor(private readonly settings?: Pick<FeedbackSettings, 'read'>) {}

  /** assert() with the window read from the settings (cached). */
  async check(input: { ip: string; token: string }, now = Date.now()): Promise<void> {
    const minutes = this.settings ? (await this.settings.read()).feedback_rate_window_min : SETTING_DEFAULTS.feedback_rate_window_min;
    this.assert({ ...input, windowMs: minutes * MIN_MS }, now);
  }

  /** 429 too_many_requests when either bucket is full. */
  assert(input: LimitCall, now = Date.now()): void {
    const { windowMs = WINDOW_MS } = input;
    const ok = this.perIp.allow(input.ip, now, windowMs) && this.perToken.allow(`${input.ip}|${input.token}`, now, windowMs);
    if (!ok) {
      throw new HttpException(
        { code: 'too_many_requests', message: 'too_many_requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
