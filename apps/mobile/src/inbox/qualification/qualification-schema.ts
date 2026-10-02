import { leadQualificationPatchSchema, optionalText, phoneE164 } from '@ab/shared';

// The registration form's deleted v1 questions (research-forms item 9, R-LEAD-03), optional jsonb
// keys on leads.qualification. ponytail: a local extension of the shared PATCH schema until
// packages/shared/src/schemas/leads.ts gains the same keys and FILLED_BY / GROUP_KINDS (the
// web-forms branch adds them); then import those and drop this file. The API strips unknown keys
// until then, so these answers are not saved before that merge.

export const FILLED_BY = ['guardian', 'student'] as const;
export type FilledBy = (typeof FILLED_BY)[number];

export const GROUP_KINDS = ['individual', 'group'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

/** PATCH /leads/:id/qualification body: the shared keys plus the v1 ones. Picked values only. */
export const qualificationPatchSchema = leadQualificationPatchSchema.extend({
  city: optionalText,
  filled_by: optionalText,
  guardian_name: optionalText,
  guardian_relation: optionalText,
  /** «رقم تواصل بديل», stored E.164 (rule 7). */
  alt_phone: phoneE164.nullish(),
  group_kind: optionalText,
  notes: optionalText,
});

export type QualificationPatch = ReturnType<typeof qualificationPatchSchema.parse>;
