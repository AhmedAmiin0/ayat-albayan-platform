import type { Json } from '@ab/db';

export interface Sendable {
  template_key: string | null;
  template_params: Json | null;
  body: string | null;
}
