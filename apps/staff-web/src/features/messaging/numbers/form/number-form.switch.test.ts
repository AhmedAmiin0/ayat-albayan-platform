import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { evolutionView, numberView } from '@/features/messaging/numbers/numbers.fixture';
import { draftOf, switchErrors } from './number-form';

// Final review 5: switching an ENABLED number to Evolution would skip the unsynced-enable confirm.

const toEvolution = (view = numberView()) => ({ ...draftOf(view), provider: 'evolution' as const });

describe('switchErrors', () => {
  it('refuses an enabled Meta number switched to Evolution, in words on the provider', () => {
    const view = numberView({ enabled: true });
    expect(switchErrors(view, toEvolution(view))).toEqual({
      provider: t.numbers.errors.evolution_switch_enabled,
    });
  });

  it('a disabled number, an Evolution number already, a new one or no switch: nothing', () => {
    const off = numberView({ enabled: false });
    expect(switchErrors(off, toEvolution(off))).toEqual({});
    const evo = evolutionView({ enabled: true });
    expect(switchErrors(evo, draftOf(evo))).toEqual({});
    expect(switchErrors(undefined, toEvolution())).toEqual({});
    const on = numberView({ enabled: true });
    expect(switchErrors(on, draftOf(on))).toEqual({});
  });
});
