import type { NaturalKey, RowIssue, SourceRow } from '../../types.ts';

export interface PersonFields {
  age: number | null;
  gender: string | null;
  country: string | null;
  /** The zone the family said they attend in; beats the phone's. */
  tzCountry: string | null;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  notes: string | null;
  guardianName: string | null;
  source: string | null;
  teacherText: string | null;
}

export interface PersonRow {
  ref: SourceRow['ref'];
  key: NaturalKey;
  kind: Kind;
  phone: string;
  name: string;
  legacy: number | null;
  /** Why the old rule called this child active: reported as downgrades only, never a status. */
  claims: OldClaim[];
  fields: PersonFields;
}

/** docs/06 status mapping: old evidence claims. */
export type OldClaim = 'hub_current' | 'subscribed_booking' | 'heart_row';

/** A row with a valid phone but no child name: the family (guardian) is kept, the child is not. */
export interface PhoneOnly {
  ref: SourceRow['ref'];
  phone: string;
  fields: PersonFields;
}

export interface PeopleRowsResult {
  rows: PersonRow[];
  issues: RowIssue[];
  phoneOnly?: PhoneOnly;
}

export type Kind = 'student' | 'registration' | 'booking' | 'heart';
