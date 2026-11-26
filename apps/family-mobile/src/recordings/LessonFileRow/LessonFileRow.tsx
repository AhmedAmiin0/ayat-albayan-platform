import type { PortalLessonFile } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ListRow, t } from '@ab/mobile-kit';
import { fileLine, fileTitle } from '@/recordings/file-text';
import { VoiceNote } from '@/recordings/VoiceNote';

interface LessonFileRowProps {
  file: PortalLessonFile;
  studentId: string;
  /** A picture or a PDF: opened in the phone's viewer. */
  onOpen: (fileId: string) => void;
}

/** One lesson file: a voice note opens the player under it, anything else opens outside. */
export function LessonFileRow({ file, studentId, onOpen }: LessonFileRowProps) {
  const [playing, setPlaying] = useState(false);
  const audio = file.media === 'audio';
  const press = () => (audio ? setPlaying(!playing) : onOpen(file.id));
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
