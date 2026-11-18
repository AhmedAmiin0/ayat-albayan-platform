import type { LinkField, LinkFieldErrors } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** A field's refusal in words (shortLinks.form.errors), or undefined while it is fine. */
export function errorText(errors: LinkFieldErrors, field: LinkField): string | undefined {
  const key = errors[field];
  return key && t.shortLinks.form.errors[key];
}
