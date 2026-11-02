import type { Json } from '@ab/db';
import type { CustomConfigView } from '@ab/shared';

export interface CustomConfigRow {
  key: string;
  value: Json;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

export const CUSTOM_COLUMNS = 'key, value, description, is_public, updated_at, updated_by';

export function toCustomView(r: CustomConfigRow): CustomConfigView {
  return {
    key: r.key,
    value: r.value,
    description: r.description,
    isPublic: r.is_public,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}
