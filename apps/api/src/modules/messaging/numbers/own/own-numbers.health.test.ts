import { describe, expect, it, vi } from 'vitest';
import type { LineCheckView } from '@ab/shared';
import { NumbersHealth } from '@/modules/messaging/numbers/lines/numbers.health';
import type { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import type { OwnNumbers } from './own-numbers';

describe('NumbersHealth → OwnNumbers', () => {
  it('a line check re-reads our own numbers (a display phone just learnt counts at once)', async () => {
    const own = { forget: vi.fn() };
    const health = new NumbersHealth({ saveHealth: vi.fn() } as unknown as NumbersRepo, own as unknown as OwnNumbers);
    await health.save([] as LineCheckView[]);
    expect(own.forget).toHaveBeenCalledOnce();
  });
});
