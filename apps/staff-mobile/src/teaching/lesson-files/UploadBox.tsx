import { pickProblem, type PickedFile, type UploadProblem } from '@ab/client-core';
import { LESSON_FILE_KINDS, type LessonFileKind } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText, Button, ButtonRow, ErrorLine, FilterPills, SwitchRow, t, type, useTheme,
} from '@ab/mobile-kit';
import { useUploadFile } from './api';
import { PICK_SOURCES, pickFile, type PickSource } from './pick-file';

const F = t.lessonFiles;
const PROBLEM: Record<UploadProblem, string> = {
  type: F.badType,
  too_large: F.tooLarge,
  failed: F.uploadFailed,
};
const KINDS = LESSON_FILE_KINDS.map((k) => ({ value: k, label: F.kinds[k] }));

export function UploadBox({ lessonId }: { lessonId: string }) {
  const { color } = useTheme();
  const small = { fontSize: type.size.xs };
  const upload = useUploadFile();
  const [kind, setKind] = useState<LessonFileKind>('homework');
  const [visible, setVisible] = useState(true);
  const [problem, setProblem] = useState<UploadProblem | null>(null);
  const send = (file: PickedFile): void => {
    const refused = pickProblem(file);
    setProblem(refused);
    const failed = { onError: () => setProblem('failed') };
    if (!refused) upload.mutate({ lessonId, kind, visible, file }, failed);
  };
  const pick = async (source: PickSource): Promise<void> => {
    const file = await pickFile(source);
    if (file) send(file);
  };
  return (
    <View style={{ gap: 10 }}>
      <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{F.add}</AppText>
      <AppText style={{ ...small, color: color.ink3 }}>{F.hint}</AppText>
      <FilterPills items={KINDS} value={kind} onChange={setKind} accessibilityLabel={F.kind} />
      <SwitchRow label={F.visible} value={visible} onChange={setVisible} />
      <ButtonRow>
        {PICK_SOURCES.map((s) => (
          <Button
            key={s}
            variant="secondary"
            label={F.sources[s]}
            busy={upload.isPending}
            onPress={() => void pick(s)}
          />
        ))}
      </ButtonRow>
      {upload.isPending ? (
        <AppText style={{ ...small, color: color.ink3 }}>{F.uploading}</AppText>
      ) : null}
      {upload.isSuccess && !problem ? (
        <AppText style={{ ...small, color: color.ok }}>{F.uploaded}</AppText>
      ) : null}
      {problem ? <ErrorLine message={PROBLEM[problem]} /> : null}
    </View>
  );
}
