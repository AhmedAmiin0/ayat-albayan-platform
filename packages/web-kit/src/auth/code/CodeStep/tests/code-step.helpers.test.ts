import type { SubmitEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { isBoxError, submitWith } from '@ab/web-kit/auth/code/CodeStep/code-step.helpers';

const E = t.familyAuth.errors;

describe('code-step helpers', () => {
  it('only a wrong or short code marks the boxes', () => {
    expect(isBoxError(E.invalid_code)).toBe(true);
    expect(isBoxError(E.code_incomplete)).toBe(true);
    expect(isBoxError(t.common.error)).toBe(false);
    expect(isBoxError(undefined)).toBe(false);
  });

  it('a submit is kept from navigating and runs onSubmit once', () => {
    const onSubmit = vi.fn();
    const preventDefault = vi.fn();
    const event = { preventDefault } as unknown as SubmitEvent<HTMLFormElement>;
    submitWith(onSubmit)(event);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
