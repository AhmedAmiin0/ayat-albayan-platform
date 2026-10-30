import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PresenceRepo } from './presence.repo';
import { PresenceSettings } from './presence.settings';
import { TouchThrottle } from './touch-throttle';

/** The queued users are written this often, in one call. */
export const LAST_SEEN_FLUSH_MS = 15_000;

/**
 * Last seen (docs/33 §1.2): an authenticated request queues its user, at most once a minute per
 * user (TouchThrottle); a timer (unref'd) writes the queue every LAST_SEEN_FLUSH_MS in one call,
 * only while presence_enabled is on. Nothing runs inside the request; a failure is a warning. A
 * shutdown drops the last window (under 15 s of last seen).
 */
@Injectable()
export class LastSeenService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(LastSeenService.name);
  private readonly throttle = new TouchThrottle();
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repo: PresenceRepo,
    private readonly settings: PresenceSettings,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), LAST_SEEN_FLUSH_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Queues the user when their write is due (synchronous, no I/O). */
  seen(userId: string, nowMs = Date.now()): void {
    if (this.throttle.take(userId, nowMs)) this.pending.add(userId);
  }

  get queued(): number {
    return this.pending.size;
  }

  /** Writes the queue (if the switch is on) and empties it; never rejects. */
  async flush(): Promise<void> {
    const ids = [...this.pending];
    this.pending = new Set();
    if (ids.length === 0) return;
    try {
      if (!(await this.settings.enabled())) return;
      await this.repo.touch(ids);
    } catch (e) {
      this.log.warn(`last seen not written: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
}
