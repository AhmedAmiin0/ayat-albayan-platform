import type { KnownNumber } from './known-number';

/** What the three phone reads found (known-number.repo.ts). */
export interface KnownParts {
  guardian: { id: string; name: string; tz: string } | null;
  lead: { id: string; status: KnownNumber['lead_status'] } | undefined;
  teacher: { id: string } | undefined;
}
