import { linkErrorText, type LinkField, type LinkFieldErrors } from '@ab/client-core';
import { t } from '@ab/web-kit';

/** A field's refusal in words (shortLinks.form.errors), or undefined while it is fine. */
export const errorText = (errors: LinkFieldErrors, field: LinkField): string | undefined =>
  linkErrorText(errors, field, t.shortLinks.form.errors);
