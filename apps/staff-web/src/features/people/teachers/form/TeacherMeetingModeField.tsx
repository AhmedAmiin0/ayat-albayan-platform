import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { RadioChips, t, publicConfigQuery } from '@ab/web-kit';
import {
  academyOptionText,
  effectivePlatform,
  fromChoice,
  knownAcademyAuto,
  toChoice,
  type MeetingModeChoice,
} from './meeting-mode-text';
import { MeetingModeWarnings } from './MeetingModeWarnings';
import type { SetField, TeacherForm } from './teacher-form';
import type { Teacher } from '@ab/shared';

interface Props {
  form: TeacherForm;
  set: SetField;
  /** The teacher edited (null when adding): their resolved mode stands in until settings load. */
  teacher?: Teacher | null;
}

/** The academy default comes from GET /settings/public, so nothing is claimed before it answers. */
export function TeacherMeetingModeField({ form, set, teacher = null }: Props) {
  const notesId = useId();
  const config = useQuery(publicConfigQuery);
  const academyAuto = knownAcademyAuto(
    config.isSuccess ? config.data.meeting_link_auto : undefined,
    teacher,
  );
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
      <MeetingModeWarnings
        id={notesId}
        platform={effectivePlatform(form.meeting_mode, academyAuto)}
        link={form.meeting_link}
      />
    </div>
  );
}
