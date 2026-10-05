import type { AcademySettings } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { ListRow } from '@/ui/ListRow';

/** The switches that stay on the web: shown, never editable here (they send real WhatsApp messages). */
export function ReadOnlySettings({ settings }: { settings: AcademySettings }) {
  const m = t.mobileAdmin.settings;
  const rows: [string, boolean][] = [
    [m.messagingEnabled, settings.messaging_enabled],
    [m.autoMessagesEnabled, settings.auto_messages_enabled],
    [m.crmCutoverDone, settings.crm_cutover_done],
  ];
  return (
    <Section title={m.readOnlyTitle}>
      <View style={{ marginHorizontal: -16 }}>
        {rows.map(([label, on]) => (
          <ListRow key={label} title={label} trailing={<Note>{on ? m.on : m.off}</Note>} />
        ))}
      </View>
      <Note>{m.readOnlyNote}</Note>
    </Section>
  );
}
