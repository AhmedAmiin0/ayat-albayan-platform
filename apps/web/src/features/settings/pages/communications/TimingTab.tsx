import type { SettingsFormState } from '../../registry-form/use-settings-form';
import { SaveBar } from '../../SaveBar';
import { SectionFields } from '../../sections/SectionFields';

/**
 * «مواعيد الرسائل» (D14): the messages' timing fields (the registry's «messaging» rows) and their
 * «حفظ», in a tab of their own. The form lives on the page, so switching tabs keeps an unsaved edit.
 */
export function TimingTab({ state }: { state: SettingsFormState }) {
  return (
    <div className="grid min-w-0 gap-2">
      <SectionFields id="messaging" state={state} />
      <SaveBar state={state} />
    </div>
  );
}
