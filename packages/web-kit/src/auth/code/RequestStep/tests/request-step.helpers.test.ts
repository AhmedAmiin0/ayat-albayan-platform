import type { SubmitEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { submitWhenFilled } from '@ab/web-kit/auth/code/RequestStep/request-step.helpers';

const submitted = (value: string) => {
  const onSubmit = vi.fn();
  const preventDefault = vi.fn();
  const event = { preventDefault } as unknown as SubmitEvent<HTMLFormElement>;
  submitWhenFilled(value, onSubmit)(event);
  expect(preventDefault).toHaveBeenCalledOnce();
  return onSubmit.mock.calls.length;
};

describe('submitWhenFilled', () => {
  it('a value submits once; a blank or spaces-only value does not', () => {
    expect(submitted('5')).toBe(1);
    expect(submitted('')).toBe(0);
    expect(submitted('   ')).toBe(0);
  });
});
