import type { Json } from '@ab/db';

/** One custom entry as the admin API returns it (GET /config/custom). */
export interface CustomConfigView {
  key: string;
  value: Json;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string | null;
}
