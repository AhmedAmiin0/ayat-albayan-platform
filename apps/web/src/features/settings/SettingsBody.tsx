import type { AcademySettings } from '@ab/shared';
import { Fragment } from 'react';
import { t } from '@/lib/i18n';
import { PAGE_SECTIONS, type SectionProps } from './page-sections';
import { useSettingsForm } from './registry-form/use-settings-form';
import { SaveBar } from './SaveBar';
import { useNothingMatches } from './use-nothing-matches';

interface BodyProps {
  settings: AcademySettings;
  query: string;
  onSaved: () => void;
  onNote: (message: string) => void;
}

/** The sections in page order, with one «حفظ» bar for every field (the switches save on their own). */
export function SettingsBody({ settings, query, onSaved, onNote }: BodyProps) {
  const state = useSettingsForm(settings, onSaved);
  const none = useNothingMatches(query);
  const props: SectionProps = { settings, state, query, onNote };
  return (
    <div className="grid min-w-0 gap-10">
      {none && <p className="text-sm text-ink-3">{t.config.search.none}</p>}
      {PAGE_SECTIONS.map((s) => (
        <Fragment key={s.id}>{s.render(props)}</Fragment>
      ))}
      <SaveBar state={state} />
    </div>
  );
}
