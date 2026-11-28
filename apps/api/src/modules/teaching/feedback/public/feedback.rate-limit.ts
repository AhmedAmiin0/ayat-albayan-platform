import { SETTING_DEFAULTS } from '@ab/settings';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { FeedbackSettings } from '@/modules/teaching/feedback/feedback.settings';
import { MIN_MS, WINDOW_MS, WindowCounter } from './feedback.window-counter';

export interface LimitCall {
  ip: string;
  token: string;
  windowMs?: number;
}

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
    const minutes = this.settings
      ? (await this.settings.read()).feedback_rate_window_min
      : SETTING_DEFAULTS.feedback_rate_window_min;
    this.assert({ ...input, windowMs: minutes * MIN_MS }, now);
  }

  /** 429 too_many_requests when either bucket is full. */
  assert(input: LimitCall, now = Date.now()): void {
    const { windowMs = WINDOW_MS } = input;
    const ok =
      this.perIp.allow(input.ip, now, windowMs) &&
      this.perToken.allow(`${input.ip}|${input.token}`, now, windowMs);
    if (!ok) {
      throw new HttpException(
        { code: 'too_many_requests', message: 'too_many_requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
