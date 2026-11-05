import { apiErrorCode } from '../../core/http/index.js';

/** The app's `t.peopleEdit.errors`: one sentence per API code, and `generic` for anything else. */
export type PeopleEditErrorText = Record<string, string | undefined> & { generic: string };

/** The API error's `code` (409 same_guardian, student_has_records…) → the app's words. */
export function peopleEditErrorText(error: unknown, text: PeopleEditErrorText): string {
  const code = apiErrorCode(error);
  return (code ? text[code] : undefined) ?? text.generic;
}
