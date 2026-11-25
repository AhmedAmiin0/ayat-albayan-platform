import type { LinkError, LinkField, LinkFieldErrors } from '../link-form-errors';

// What a create / edit screen does with a form check (toCreateBody / toUpdateBody): the body to
// send, or each field's refusal in the app's words (shortLinks.form.errors).

export interface SplitLinkCheck<B> {
  /** null while a field is wrong. */
  body: B | null;
  /** None once the check passed. */
  errors: LinkFieldErrors;
}

/** Both sides of a check's answer, so no screen needs a shape test. */
export function splitLinkCheck<B>(
  check: { body: B } | { errors: LinkFieldErrors },
): SplitLinkCheck<B> {
  return { body: null, errors: {}, ...check };
}

/** A field's refusal in words (`words`: shortLinks.form.errors), or undefined while it is fine. */
export function linkErrorText(
  errors: LinkFieldErrors,
  field: LinkField,
  words: Readonly<Record<LinkError, string>>,
): string | undefined {
  const key = errors[field];
  return key === undefined ? undefined : words[key];
}
