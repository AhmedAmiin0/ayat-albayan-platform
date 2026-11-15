import { View } from 'react-native';
import { AppText, Button, t, type, useTheme } from '@ab/mobile-kit';
import { useOpenFile, useOpenUrl } from './use-open-file';

interface ReportFilesProps {
  studentId: string;
  reportId: string;
  /** The page's own signed PDF link; null while it is generated or when the page did not load. */
  pdfUrl: string | null;
  recordingId: string | null;
}

/**
 * «تحميل التقرير PDF» and «شاهد تسجيل الحلقة» (when staff made it visible): each opens outside
 * the app. Without the page's link the PDF comes through the portal's own signed link.
 */
export function ReportFiles({ studentId, reportId, pdfUrl, recordingId }: ReportFilesProps) {
  const { color } = useTheme();
  const file = useOpenFile();
  const url = useOpenUrl();
  const R = t.portal.app.report;
  const pdf = (): void =>
    pdfUrl ? url.mutate(pdfUrl) : file.mutate({ studentId, kind: 'reports', id: reportId });
  const failed = file.isError || url.isError;
  return (
    <View style={{ gap: 10 }}>
      {recordingId ? (
        <Button
          variant="secondary"
          label={R.recording}
          busy={file.isPending}
          onPress={() => file.mutate({ studentId, kind: 'recordings', id: recordingId })}
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
