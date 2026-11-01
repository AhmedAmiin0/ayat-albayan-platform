import type { AcademySettings } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';

/** Joins the web note with a caller's own line into one note (the overview stays one phone high). */
export const readOnlyNoteText = (more?: string): string =>
  more ? `${t.mobileAdmin.settings.readOnlyNote} ${more}` : t.mobileAdmin.settings.readOnlyNote;

/**
 * The switches that stay on the web: shown, never editable here (they send real WhatsApp messages).
 * `note` adds a line to the web note instead of a block of its own.
 */
export function ReadOnlySettings({ settings, note }: { settings: AcademySettings; note?: string }) {
  const m = t.mobileAdmin.settings;
  const rows: [string, boolean][] = [
    [m.messagingEnabled, settings.messaging_enabled],
    [m.autoMessagesEnabled, settings.auto_messages_enabled],
    [m.crmCutoverDone, settings.crm_cutover_done],
  ];
  return (
    <Section title={m.readOnlyTitle}>
      <InsetGroup>
        {rows.map(([label, on]) => (
          <ListRow key={label} title={label} trailing={<Note>{on ? m.on : m.off}</Note>} />
        ))}
      </InsetGroup>
      <Note>{readOnlyNoteText(note)}</Note>
    </Section>
  );
}
