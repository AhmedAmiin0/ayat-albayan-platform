import { describe, expect, it, vi } from 'vitest';
import { submitWith } from './sign-in.helpers';

const event = () => ({ preventDefault: vi.fn() });

describe('submitWith', () => {
  it('keeps the page and runs the action once', () => {
    const run = vi.fn();
    const e = event();
    submitWith(run)(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('an async action is started, not awaited', () => {
    const run = vi.fn(() => new Promise<void>(() => undefined));
    const handler = vi.fn(submitWith(run));
    handler(event());
    expect(handler).toHaveReturnedWith(undefined);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
