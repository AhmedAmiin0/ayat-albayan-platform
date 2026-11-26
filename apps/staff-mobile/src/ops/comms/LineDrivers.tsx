import { WA_LINES, type WaLine, type WaProvider } from '@ab/catalog';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions, t, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { useSettings } from '@/ops/settings/use-settings';
import { driverName, driverValues } from './line-driver';
import { LineDriverRow } from './LineDriverRow';
import { useIntegrations, useSaveIntegrationValues } from './use-line-drivers';

/** docs/19: hidden without settings.read; in module mode each number's provider sends. */
export function LineDrivers() {
  const h = t.communicationsHub;
  const query = useIntegrations();
  const save = useSaveIntegrationValues();
  const canWrite = usePermissions()('settings.write');
  const [said, setSaid] = useState<string | null>(null);
  const moduleMode = useSettings().data?.comms_source === 'module';
  if (!Array.isArray(query.data)) return null;
  if (moduleMode) {
    return (
      <Section title={h.driverTitle}>
        <Note>{h.driverModule}</Note>
      </Section>
    );
  }
  const items = query.data;
  const onSave = (line: WaLine, provider: WaProvider) => {
    setSaid(null);
    save.mutate(
      driverValues(line, provider),
      {
        onSuccess: () => setSaid(h.driverSaved.replace('{line}', t.enums.waLine[line]).replace('{driver}', driverName(provider))),
        onError: () => setSaid(h.driverFailed),
      },
    );
  };
  return (
    <Section title={h.driverTitle}>
      <Note>{h.driverIntro}</Note>
      {!canWrite && <Note>{h.driverReadOnly}</Note>}
      <View style={{ gap: 12 }}>
        {WA_LINES.map((line) => (
          <LineDriverRow
            key={line}
            line={line}
            items={items}
            canWrite={canWrite}
            busy={save.isPending}
            onSave={onSave}
          />
        ))}
      </View>
      {said && (
        <View accessibilityLiveRegion="polite">
          <Note>{said}</Note>
        </View>
      )}
    </Section>
  );
}
