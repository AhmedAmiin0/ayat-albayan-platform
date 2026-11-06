import type { StorageDriver } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';

/** What /health says of the store new files go to (docs/45). */
export interface StorageHealthView {
  driver: StorageDriver;
  status: 'ok' | 'down';
}

/** The load balancer asks /health every 2 s per copy: the store is asked at most this often. */
const STORAGE_HEALTH_MS = 30_000;

/**
 * Storage reachability for /health. Reported, never fatal: a down store must not take the API
 * copies out of the load balancer (uploads fail with their own error; old files still open).
 */
@Injectable()
export class StorageHealth {
  private last: { at: number; view: Promise<StorageHealthView> } | null = null;

  constructor(private readonly storage: StorageService) {}

  view(now = Date.now()): Promise<StorageHealthView> {
    const fresh = this.last !== null && now - this.last.at < STORAGE_HEALTH_MS;
    if (!fresh || !this.last) this.last = { at: now, view: this.check() };
    return this.last.view;
  }

  private async check(): Promise<StorageHealthView> {
    const driver = this.storage.writesTo();
    const status = await this.storage.ping().then(
      () => 'ok' as const,
      () => 'down' as const,
    );
    return { driver, status };
  }
}
