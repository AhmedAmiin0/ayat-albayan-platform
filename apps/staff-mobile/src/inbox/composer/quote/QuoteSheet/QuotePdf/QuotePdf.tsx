import { View } from 'react-native';
import { t, Button, ErrorLine, space } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import type { QuotePdfProps } from './QuotePdf.types';
import { useQuotePdf } from './use-quote-pdf';

const p = t.inbox.quote.pdf;
const STACK = { gap: space[2] };

/** The whole list as a PDF: made for the choice on screen, opened to check, then sent. */
export function QuotePdf(props: QuotePdfProps) {
  const pdf = useQuotePdf(props);
  const ready = pdf.pdf;
  return (
    <View style={STACK}>
      {pdf.makeError ? <ErrorLine message={pdf.makeError} /> : null}
      {pdf.sendError ? <ErrorLine message={pdf.sendError} /> : null}
      {ready === null ? (
        <Button
          variant="secondary"
          label={pdf.creating ? p.creating : p.create}
          busy={pdf.creating}
          onPress={pdf.create}
        />
      ) : (
        <ButtonRow>
          <Button variant="secondary" label={p.open} onPress={() => pdf.view(ready)} />
          <Button
            variant="secondary"
            label={pdf.sending ? p.sending : p.send}
            busy={pdf.sending}
            disabled={!props.open}
            onPress={() => pdf.send(ready)}
          />
        </ButtonRow>
      )}
    </View>
  );
}
