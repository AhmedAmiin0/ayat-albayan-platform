import { WA_LINES, type WaLine, type WaProvider } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/more/Section';
import { useSettings } from '@/ops/settings/use-settings';
import { driverName, driverValues } from './line-driver';
import { LineDriverRow } from './LineDriverRow';
import { useIntegrations, useSaveIntegrationValues } from './use-line-drivers';

/**
 * «مزوّد الإرسال لكل خط» on the overview (docs/19, owner 2026-10-25: «switch between crm and other
 * drivers»): each line's driver, switched after its confirm; one save at a time. Hidden when the integrations
 * list cannot be read (no settings.read, an older API); the keys themselves are still set on the web. In module
 * mode (comms_source = module) each number's own provider sends and WA_PROVIDER is not read: a note, no switch.
 */
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
          <LineDriverRow key={line} line={line} items={items} canWrite={canWrite} busy={save.isPending} onSave={onSave} />
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
