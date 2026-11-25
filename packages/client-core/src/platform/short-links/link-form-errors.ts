import { z } from 'zod';
import { ApiError, apiErrorCode } from '../../core/http';

// What a create / edit field says when the form check or the API refuses it: the keys of
// shortLinks.form.errors (ar.json / en.json), per field.

export const LINK_FIELDS = [
  'title',
  'targetUrl',
  'expiresAt',
  'maxUsers',
  'people',
  'phones',
  'form',
] as const;
export type LinkField = (typeof LINK_FIELDS)[number];

export const LINK_ERRORS = [
  'title_invalid',
  'target_invalid',
  'target_not_allowed',
  'expiry_invalid',
  'expiry_past',
  'max_users_invalid',
  'users_required',
  'phone_invalid',
  'too_many_users',
  'not_found',
  'generic',
] as const;
export type LinkError = (typeof LINK_ERRORS)[number];

export type LinkFieldErrors = Partial<Record<LinkField, LinkError>>;

/** The body key an issue sits on → the form field and its usual words. */
const FIELD_OF: Readonly<Record<string, readonly [LinkField, LinkError]>> = {
  title: ['title', 'title_invalid'],
  targetUrl: ['targetUrl', 'target_invalid'],
  expiresAt: ['expiresAt', 'expiry_invalid'],
  maxUsers: ['maxUsers', 'max_users_invalid'],
  profileIds: ['people', 'too_many_users'],
  phones: ['phones', 'phone_invalid'],
};

/** Issue messages that are already a key (the schema's own refine). */
const MESSAGE_ERRORS: Readonly<Record<string, readonly [LinkField, LinkError]>> = {
  users_required: ['people', 'users_required'],
};

/** The API's domain codes (400 / 404) → the field they belong to. */
const CODE_ERRORS: Readonly<Record<string, readonly [LinkField, LinkError]>> = {
  target_not_allowed: ['targetUrl', 'target_not_allowed'],
  invalid_expiry: ['expiresAt', 'expiry_invalid'],
  users_required: ['people', 'users_required'],
  short_link_not_found: ['form', 'not_found'],
};

const GENERIC = ['form', 'generic'] as const;

interface Issue {
  /** zod's own path, or the API's dotted string. */
  path: string | readonly PropertyKey[];
  message: string;
}

const headOf = (path: Issue['path']): string =>
  typeof path === 'string' ? (path.split('.')[0] ?? '') : String(path[0] ?? '');

const pairOf = (issue: Issue): readonly [LinkField, LinkError] =>
  MESSAGE_ERRORS[issue.message] ?? FIELD_OF[headOf(issue.path)] ?? GENERIC;

/** Each field's first problem (the form check's zod issues or the API's 400 issues). */
export function issueErrors(issues: readonly Issue[]): LinkFieldErrors {
  const out: LinkFieldErrors = {};
  for (const [field, error] of issues.map(pairOf)) out[field] ??= error;
  return out;
}

const validation = z.object({
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
});

/** A refused create / edit → the field errors to show (an unknown failure: the form's line). */
export function linkServerErrors(e: unknown): LinkFieldErrors {
  const known = CODE_ERRORS[apiErrorCode(e) ?? ''];
  if (known) return { [known[0]]: known[1] };
  const parsed = validation.safeParse(e instanceof ApiError ? e.body : null);
  return parsed.success ? issueErrors(parsed.data.issues) : { form: 'generic' };
}
