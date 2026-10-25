import { driverMissing, WA_PROVIDERS, type IntegrationConfigItem, type WaLine, type WaProvider } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { driverName, lineDriver } from './line-driver';

export interface LineDriverRowProps {
  line: WaLine;
  items: readonly IntegrationConfigItem[];
  /** settings.write: without it the choice is shown, not offered. */
  canWrite: boolean;
  /** A save is running (this line's or another's): every confirm waits. */
  busy: boolean;
  onSave: (line: WaLine, provider: WaProvider) => void;
}

/**
 * One line's driver (docs/19, like the web's LineDriver + «التكاملات» select): Meta / Kapso / «نظام CRM».
 * Picking another one never saves by itself: it shows what that driver still lacks (key NAMES, never a
 * value) and asks «سيُرسل هذا الخط عبر …» first. Saved = the API's audited PUT /settings/integrations.
 */
export function LineDriverRow({ line, items, canWrite, busy, onSave }: LineDriverRowProps) {
  const h = t.communicationsHub;
  const current = lineDriver(items, line);
  const [picked, setPicked] = useState<WaProvider | null>(null);
  // Cleared once the save lands (the cache then reads the new driver), so a later change elsewhere never
  // reopens it; a failed save keeps the confirm to retry.
  if (picked !== null && picked === current) setPicked(null);
  const lineName = t.enums.waLine[line];
  const options = WA_PROVIDERS.map((p) => ({ value: p, label: driverName(p), disabled: !canWrite || busy }));
  const missing = picked ? driverMissing({ provider: picked, line, items }) : [];
  const choose = (p: WaProvider) => setPicked(p === current ? null : p);
  const confirm = () => {
    if (picked) onSave(line, picked);
  };
  return (
    <View testID={`driver-${line}`} style={{ gap: 6 }}>
      <Note>{`${lineName} · ${h.driverCurrent.replace('{driver}', driverName(current))}`}</Note>
      <FilterPills role="radiogroup" wrap accessibilityLabel={h.driverPicker.replace('{line}', lineName)} items={options} value={picked ?? current} onChange={choose} />
      {picked && (
        <View style={{ gap: 6 }}>
          {missing.length === 0 ? (
            <Note>{h.driverReady.replace('{driver}', driverName(picked))}</Note>
          ) : (
            <View testID={`driver-missing-${line}`} style={{ gap: 2 }}>
              <Note>{h.driverMissing.replace('{driver}', driverName(picked))}</Note>
              {missing.map((k) => (
                <Ltr key={k}>{k}</Ltr>
              ))}
            </View>
          )}
          <InlineConfirm
            message={h.driverConfirm.replace('{driver}', driverName(picked))}
            confirmLabel={busy ? t.common.saving : h.driverConfirmYes}
            busy={busy}
            onConfirm={confirm}
            onCancel={() => setPicked(null)}
          />
        </View>
      )}
    </View>
  );
}
