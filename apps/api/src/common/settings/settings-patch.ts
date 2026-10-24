import { parseSettingField, splitSettingsPatch, type SettingsPatchSplit } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';

/** The alias split plus the followUpHours the caller may write through the follow-up rule (23-P4). */
export type AliasPatchSplit = SettingsPatchSplit & { followUpHours: number[] | null };

const FOLLOW_UP_FIELDS = ['followUpHours', 'follow_up_hours'] as const;

/**
 * followUpHours / follow_up_hours is owned by the notification rules (moved), but a caller holding
 * notifications.manage still writes it from the 0.2.0 phone (docs/26 §2f): validated by its registry
 * def, it becomes `saved` (or `invalid`) and is applied through the rules by the controller.
 */
function takeFollowUp(body: Readonly<Record<string, unknown>>, out: AliasPatchSplit): void {
  const field = FOLLOW_UP_FIELDS.find((f) => Object.hasOwn(body, f) && body[f] !== undefined);
  if (!field) return;
  out.moved = out.moved.filter((k) => k !== 'follow_up_hours');
  const parsed = parseSettingField({ field, key: 'follow_up_hours', value: body[field] });
  if (parsed.ok) {
    out.followUpHours = parsed.value as number[];
    out.saved.push('follow_up_hours');
  } else {
    out.invalid.push('follow_up_hours');
    out.issues.push(...parsed.issues);
  }
}

/**
 * PATCH /settings raw body → its per-key split (docs/26 §2f). A non-object body is a 400. Only when a
 * registry field was invalid and nothing could be saved is the whole request a 400 (worded as
 * parseOrThrow: `{ message: 'validation_failed', issues }`, paths = the camelCase fields).
 * `rules: true` (the caller holds notifications.manage): followUpHours is taken, not moved.
 */
export function splitPatchOrThrow(body: unknown, opts: { rules?: boolean } = {}): AliasPatchSplit {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException({ message: 'validation_failed', issues: [{ path: '', message: 'expected_object' }] });
  }
  const record = body as Record<string, unknown>;
  const split: AliasPatchSplit = { ...splitSettingsPatch(record), followUpHours: null };
  if (opts.rules) takeFollowUp(record, split);
  if (split.invalid.length > 0 && split.saved.length === 0) {
    throw new BadRequestException({ message: 'validation_failed', issues: split.issues });
  }
  return split;
}
