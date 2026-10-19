import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { RadioChips } from '@/components/ui/radio-chips';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import type { Teacher } from './api';
import { academyOptionText, effectivePlatform, fromChoice, knownAcademyAuto, toChoice, type MeetingModeChoice } from './meeting-mode-text';
import { MeetingModeWarnings } from './MeetingModeWarnings';
import type { SetField, TeacherForm } from './teacher-form';

type Props = {
  form: TeacherForm;
  set: SetField;
  /** The teacher being edited (null when adding): their resolved mode stands in until the settings load. */
  teacher?: Teacher | null;
};

/**
 * «طريقة حضور الحلقات» (owner 2026-10-19): follow the academy switch (with what it gives today), a
 * fixed link, or the academy platform. The fixed-link field above stays either way. The academy
 * default is read from GET /settings/public itself, not usePublicConfig's registry defaults, so
 * nothing is claimed about it before the API answers.
 */
export function TeacherMeetingModeField({ form, set, teacher = null }: Props) {
  const notesId = useId();
  const config = useQuery(publicConfigQuery);
  const academyAuto = knownAcademyAuto(config.isSuccess ? config.data.meeting_link_auto : undefined, teacher);
  const options: { value: MeetingModeChoice; label: string }[] = [
    { value: 'academy', label: academyOptionText(academyAuto) },
    { value: 'static', label: t.teachers.meetingModeOption.static },
    { value: 'platform', label: t.teachers.meetingModeOption.platform },
  ];
  return (
    <div className="grid sm:col-span-2">
      <RadioChips
        name="meeting_mode"
        legend={t.teachers.meetingMode}
        options={options}
        value={toChoice(form.meeting_mode)}
        onChange={(choice) => set('meeting_mode', fromChoice(choice))}
        describedBy={notesId}
      />
      <MeetingModeWarnings id={notesId} platform={effectivePlatform(form.meeting_mode, academyAuto)} link={form.meeting_link} />
    </div>
  );
}
