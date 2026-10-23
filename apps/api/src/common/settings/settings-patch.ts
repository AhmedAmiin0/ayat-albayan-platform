import { splitSettingsPatch, type SettingsPatchSplit } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';

/**
 * PATCH /settings raw body → its per-key split (docs/26 §2f). A non-object body is a 400. Only when a
 * registry field was invalid and nothing could be saved is the whole request a 400 (worded as
 * parseOrThrow: `{ message: 'validation_failed', issues }`, paths = the camelCase fields).
 */
export function splitPatchOrThrow(body: unknown): SettingsPatchSplit {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException({ message: 'validation_failed', issues: [{ path: '', message: 'expected_object' }] });
  }
  const split = splitSettingsPatch(body as Record<string, unknown>);
  if (split.invalid.length > 0 && split.saved.length === 0) {
    throw new BadRequestException({ message: 'validation_failed', issues: split.issues });
  }
  return split;
}
