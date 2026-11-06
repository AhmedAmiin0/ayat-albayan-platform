import type { ReportPageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/core/ui/feedback/Note';
import { openUrl } from './use-report-page';

/** The teacher's attachments, then the PDF (or «يجري إعداد ملف PDF» while it renders). */
export function ReportPageFiles({ view }: { view: ReportPageView }) {
  const s = t.reportPage;
  return (
    <View style={{ gap: 8 }}>
      {view.attachments.length > 0 ? <Note>{s.files}</Note> : null}
      {view.attachments.map((f, i) => (
        <Button
          key={f.id}
          variant="secondary"
          label={s.file.replace('{n}', String(i + 1))}
          onPress={() => void openUrl(f.url)}
        />
      ))}
      {view.pdf ? (
        <Button label={s.downloadPdf} onPress={() => void openUrl(view.pdf?.url ?? '')} />
      ) : (
        <Note>{s.pdfPending}</Note>
      )}
    </View>
  );
}
