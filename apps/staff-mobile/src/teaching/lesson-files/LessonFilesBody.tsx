import type { LessonAssets } from '@ab/shared';
import { View } from 'react-native';
import { InsetGroup, Note, Section, t } from '@ab/mobile-kit';
import { StaffFileRow } from './StaffFileRow';
import { StaffRecording } from './StaffRecording';
import { UploadBox } from './UploadBox';

const F = t.lessonFiles;

export function LessonFilesBody({ data }: { data: LessonAssets }) {
  const group = data.students.length > 1;
  return (
    <View style={{ gap: 20 }}>
      {data.recordings.map((rec) => <StaffRecording key={rec.id} rec={rec} group={group} />)}
      <Section title={F.teacherFiles.replace('{n}', String(data.files.length))}>
        {data.files.length > 0 ? (
          <InsetGroup>
            {data.files.map((file) => <StaffFileRow key={file.id} file={file} />)}
          </InsetGroup>
        ) : (
          <Note>{F.noFiles}</Note>
        )}
        <Note>{F.familyNote}</Note>
      </Section>
      <UploadBox lessonId={data.lesson_id} />
    </View>
  );
}
