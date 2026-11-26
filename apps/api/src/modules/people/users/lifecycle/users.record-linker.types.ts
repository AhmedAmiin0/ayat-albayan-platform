import type { LinkKind, UserCreate } from '@ab/shared';

/** The record a request names: an existing row, or a teacher to create. */
export interface RecordRequest {
  linked_id?: string | undefined;
  new_teacher?: UserCreate['new_teacher'];
}

export interface RecordLink {
  kind: LinkKind;
  request: RecordRequest;
  /** The login's own phone and zone once its profile is written. */
  profile: { id: string; phone_e164: string | null; tz: string };
}
