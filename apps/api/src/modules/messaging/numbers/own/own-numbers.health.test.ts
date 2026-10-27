import { describe, expect, it, vi } from 'vitest';
import type { LineCheckView } from '@ab/shared';
import { NumbersHealth } from '../lines/numbers.health';
import type { NumbersQueries } from '../numbers.queries';
import type { OwnNumbers } from './own-numbers';

describe('NumbersHealth → OwnNumbers', () => {
  it('a line check re-reads our own numbers (a display phone just learnt counts at once)', async () => {
    const own = { forget: vi.fn() };
    const health = new NumbersHealth({ saveHealth: vi.fn() } as unknown as NumbersQueries, own as unknown as OwnNumbers);
    await health.save([] as LineCheckView[]);
    expect(own.forget).toHaveBeenCalledOnce();
  });
});
