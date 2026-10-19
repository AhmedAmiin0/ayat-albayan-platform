import { usesPlatform } from '@ab/shared';
import { RadioChips } from '@/components/ui/radio-chips';
import { t } from '@/lib/i18n';
import { usePublicConfig } from '@/lib/public-config';
import { academyOptionText, fromChoice, toChoice, type MeetingModeChoice } from './meeting-mode-text';
import { MeetingModeWarnings } from './MeetingModeWarnings';
import type { SetField, TeacherForm } from './teacher-form';

type Props = { form: TeacherForm; set: SetField };

/**
 * «طريقة حضور الحلقات» (owner 2026-10-19): follow the academy switch (with what it gives today), a
 * fixed link, or the academy platform. The fixed-link field above stays either way.
 */
export function TeacherMeetingModeField({ form, set }: Props) {
  const academyAuto = usePublicConfig().meeting_link_auto;
  const options: { value: MeetingModeChoice; label: string }[] = [
    { value: 'academy', label: academyOptionText(academyAuto) },
    { value: 'static', label: t.teachers.meetingModeOption.static },
    { value: 'platform', label: t.teachers.meetingModeOption.platform },
  ];
  return (
    <div className="grid gap-2 sm:col-span-2">
      <RadioChips
        name="meeting_mode"
        legend={t.teachers.meetingMode}
        options={options}
        value={toChoice(form.meeting_mode)}
        onChange={(choice) => set('meeting_mode', fromChoice(choice))}
      />
      <MeetingModeWarnings platform={usesPlatform(form.meeting_mode, academyAuto)} link={form.meeting_link} />
    </div>
  );
}
