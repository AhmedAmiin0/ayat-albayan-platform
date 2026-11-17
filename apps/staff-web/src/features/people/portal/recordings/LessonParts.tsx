import { partChoices } from '@ab/client-core';
import type { PortalRecording } from '@ab/shared';
import { useState } from 'react';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';
import { RecordingPlayer } from './RecordingPlayer';

interface Props {
  studentId: string;
  /** Newest first, as the API sends them. */
  recordings: readonly PortalRecording[];
}

/** «تسجيل الحلقة»; a lesson recorded in parts picks one: «الجزء 1 · 31 دقيقة» · «الجزء 2 …». */
export function LessonParts({ studentId, recordings }: Props) {
  const choices = partChoices(recordings, t.lessonFiles);
  const [picked, setPicked] = useState(choices[0]?.value ?? '');
  if (choices.length === 0) return null;
  return (
    <div className="grid gap-3">
      <RecordingPlayer key={picked} studentId={studentId} id={picked} />
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
