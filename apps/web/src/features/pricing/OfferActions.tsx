import { offerText, type Quote } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { waLink } from './format';

type Outcome = 'copied' | 'failed' | null;

/**
 * «انسخ العرض للعميل» (the screen's one filled button) and «أرسله على واتساب», both with the
 * site's offer text. No clipboard (http, old browser, denied) → an error toast; WhatsApp still works.
 */
export function OfferActions({ quote }: { quote: Quote }) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const text = offerText(quote, t.pricing);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setOutcome('copied');
    } catch {
      setOutcome('failed');
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Button onClick={() => void copy()}>{t.pricing.cta}</Button>
      <Button asChild variant="secondary">
        <a href={waLink(text)} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" />
          {t.pricing.sendWhatsapp}
        </a>
      </Button>
      {outcome && (
        <Toast
          key={outcome}
          tone={outcome === 'failed' ? 'error' : 'info'}
          message={outcome === 'failed' ? t.pricing.copyFailed : t.pricing.copied}
          onDismiss={() => setOutcome(null)}
        />
      )}
    </div>
  );
}
