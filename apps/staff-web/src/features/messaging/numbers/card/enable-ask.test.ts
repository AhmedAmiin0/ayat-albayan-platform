import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { evolutionPart, evolutionView, numberView } from '@/features/messaging/numbers/numbers.fixture';
import { syncView } from '@/features/messaging/numbers/evolution/sync/sync.fixture';
import { toggleAsk } from './enable-ask';

// Review fix 8: enabling an Evolution number whose webhook is not synced is asked first.

const a = t.numbers.actions;
const synced = syncView({
  synced: true, parts: { instance: 'synced', settings: 'synced', webhook: 'synced', proxy: 'synced' },
});

describe('toggleAsk', () => {
  it('turning on an Evolution number whose webhook is not synced (or never pushed) asks', () => {
    const off = { enabled: false };
    expect(toggleAsk(evolutionView(off))).toBe(a.confirmEnableUnsynced);
    const drift = evolutionView({ ...off, evolution: evolutionPart({ sync: syncView() }) });
    expect(toggleAsk(drift)).toBe(a.confirmEnableUnsynced);
    const ok = evolutionView({ ...off, evolution: evolutionPart({ sync: synced }) });
    expect(toggleAsk(ok)).toBeNull();
  });

  it('turning off a default asks; a plain Meta number never does', () => {
    const main = numberView({ enabled: true, is_default: true });
    expect(toggleAsk(main)).toBe(a.confirmDisableDefault);
    expect(toggleAsk(numberView({ enabled: false, is_default: false }))).toBeNull();
    expect(toggleAsk(numberView({ enabled: true, is_default: false }))).toBeNull();
  });
});
