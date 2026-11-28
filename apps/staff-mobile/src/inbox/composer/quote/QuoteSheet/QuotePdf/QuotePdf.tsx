import { Button, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import type { QuotePdfProps } from './QuotePdf.types';
import { useQuotePdf } from './use-quote-pdf';

/** The whole list as a PDF: made for the choice on screen, opened to check, then sent. */
export function QuotePdf(props: QuotePdfProps) {
  const pdf = useQuotePdf(props);
  return (
    <>
      {pdf.makeError ? <ErrorLine message={pdf.makeError} /> : null}
      {pdf.sendError ? <ErrorLine message={pdf.sendError} /> : null}
      {pdf.ready ? (
        <ButtonRow>
          <Button variant="secondary" label={pdf.words.open} onPress={pdf.view} />
          <Button
            variant="secondary"
            label={pdf.sending ? pdf.words.sending : pdf.words.send}
            busy={pdf.sending}
            disabled={!props.open}
            onPress={pdf.send}
          />
        </ButtonRow>
      ) : (
        <Button
          variant="secondary"
          label={pdf.creating ? pdf.words.creating : pdf.words.create}
          busy={pdf.creating}
          onPress={pdf.create}
        />
      )}
    </>
  );
}
