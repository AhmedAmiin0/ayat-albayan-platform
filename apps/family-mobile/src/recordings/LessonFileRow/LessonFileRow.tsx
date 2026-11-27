import { View } from 'react-native';
import { ListRow, t } from '@ab/mobile-kit';
import { fileLine, fileTitle } from '@/recordings/file-text';
import { VoiceNote } from '@/recordings/VoiceNote';
import type { LessonFileRowProps } from './LessonFileRow.types';
import { useLessonFileRow } from './use-lesson-file-row';

/** One lesson file: a voice note opens the player under it, anything else opens outside. */
export function LessonFileRow({ file, studentId, onOpen }: LessonFileRowProps) {
  const { playing, audio, press } = useLessonFileRow({ file, onOpen });
  return (
    <View style={{ gap: 8 }}>
      <ListRow
        title={fileTitle(file)}
        subtitle={fileLine(file)}
        onPress={press}
        accessibilityHint={audio ? t.lessonFiles.listen : t.lessonFiles.open}
      />
      {playing ? <VoiceNote studentId={studentId} fileId={file.id} /> : null}
    </View>
  );
}
