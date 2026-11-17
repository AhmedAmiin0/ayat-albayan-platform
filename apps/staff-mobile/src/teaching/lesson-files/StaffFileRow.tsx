import type { LessonFileView } from '@ab/shared';
import { View } from 'react-native';
import { Button, ButtonRow, ErrorLine, ListRow, SwitchRow, t } from '@ab/mobile-kit';
import { useFileVisibility, useOpenFile, useRemoveFile } from './api';
import { fileLine, fileTitle } from './file-words';

const F = t.lessonFiles;

/** One file staff added: name and size, «يراه الطالب وولي الأمر», open, remove. */
export function StaffFileRow({ file }: { file: LessonFileView }) {
  const visible = useFileVisibility();
  const open = useOpenFile();
  const remove = useRemoveFile();
  const failed = visible.isError || open.isError || remove.isError;
  return (
    <View style={{ gap: 4 }}>
      <ListRow title={fileTitle(file)} subtitle={fileLine(file)} />
      <SwitchRow
        label={F.visible}
        value={file.visible_to_family}
        disabled={visible.isPending}
        onChange={(on) => visible.mutate({ id: file.id, visible: on })}
      />
      <ButtonRow>
        <Button variant="secondary" label={F.open} busy={open.isPending} onPress={() => open.mutate(file.id)} />
        <Button variant="danger" label={F.remove} busy={remove.isPending} onPress={() => remove.mutate(file.id)} />
      </ButtonRow>
      {failed ? <ErrorLine message={remove.isError ? F.removeFailed : F.fileFailed} /> : null}
    </View>
  );
}
