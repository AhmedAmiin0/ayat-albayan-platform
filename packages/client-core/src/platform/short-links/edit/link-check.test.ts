import { describe, expect, it } from 'vitest';
import { LINK_ERRORS, type LinkError } from '../link-form-errors';
import { linkErrorText, splitLinkCheck } from './link-check';

const words = Object.fromEntries(LINK_ERRORS.map((k) => [k, `«${k}»`])) as Record<
  LinkError,
  string
>;

describe('splitLinkCheck', () => {
  it('gives the body and no errors when the check passed', () => {
    expect(splitLinkCheck({ body: { title: 'x' } })).toEqual({ body: { title: 'x' }, errors: {} });
  });

  it('gives no body and the errors when a field is wrong', () => {
    const errors = { title: 'title_invalid' } as const;
    expect(splitLinkCheck({ errors })).toEqual({ body: null, errors });
  });
});

describe('linkErrorText', () => {
  it('words a refused field, nothing for a fine one', () => {
    const errors = { maxUsers: 'max_users_invalid' } as const;
    expect(linkErrorText(errors, 'maxUsers', words)).toBe('«max_users_invalid»');
    expect(linkErrorText(errors, 'title', words)).toBeUndefined();
  });
});
