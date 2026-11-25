import { partChoices } from '@ab/client-core';
import type { PortalRecording, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RecordingPlayer } from './RecordingPlayer';

interface Props {
  student: Pick<PortalStudent, 'id' | 'code'>;
  /** Newest first, as the API sends them. */
  recordings: readonly PortalRecording[];
}

/** A lesson recorded in parts picks one. */
export function LessonParts({ student, recordings }: Props) {
  const choices = partChoices(recordings, t.lessonFiles);
  const [picked, setPicked] = useState(choices[0]?.value ?? '');
  const shown = choices.find((c) => c.value === picked)?.row;
  if (!shown) return null;
  return (
    <div className="grid gap-3">
      <RecordingPlayer key={picked} studentId={student.id} recording={shown} code={student.code} />
      {choices.length > 1 && (
        <RadioChips
          name={`parts-${choices[0]?.value ?? ''}`}
          legend={t.lessonFiles.partsLabel}
          options={choices}
          value={picked}
          onChange={setPicked}
        />
      )}
    </div>
  );
}
