import { vi } from 'vitest';
import type { KickController } from '@ab/web-kit/classroom/kick/use-kick';

export function aKickController(o: Partial<KickController> = {}): KickController {
  return {
    canKick: (x) => !x.isLocal,
    target: null,
    ask: vi.fn(),
    cancel: vi.fn(),
    confirm: vi.fn(),
    busy: false,
    toast: null,
    dismiss: vi.fn(),
    ...o,
  };
}
