import { View } from 'react-native';
import { AppText, Button, t, type, useTheme } from '@ab/mobile-kit';
import type { ReportFilesProps } from './ReportFiles.types';
import { useReportFiles } from './use-report-files';

/** Each opens outside the app; without the page's link the PDF uses the portal's signed link. */
export function ReportFiles({ studentId, reportId, pdfUrl, recordingId }: ReportFilesProps) {
  const { color } = useTheme();
  const { file, recording, url, R, pdf, failed } = useReportFiles({ studentId, reportId, pdfUrl });
  return (
    <View style={{ gap: 10 }}>
      {recordingId ? (
        <Button
          variant="secondary"
          label={R.recording}
          busy={recording.isPending}
          onPress={() => recording.mutate({ studentId, kind: 'recordings', id: recordingId })}
        />
      ) : null}
      <Button label={R.pdf} busy={file.isPending || url.isPending} onPress={pdf} />
      {failed ? (
        <AppText accessibilityRole="alert" style={{ fontSize: type.size.xs, color: color.bad }}>
          {t.portal.fileFailed}
        </AppText>
      ) : null}
    </View>
  );
}
