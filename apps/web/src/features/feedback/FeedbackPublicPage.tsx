import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LanguageSwitch } from '@/components/shell/LanguageSwitch';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/api';
import { publicFeedbackQuery, type PublicProblem } from './api';
import { FeedbackForm } from './FeedbackForm';
import { ThankYou } from './ThankYou';

/**
 * «رأيك يهمّنا» for the guardian (no login, the token in the link): mobile first, one column, the
 * language switch beside the title. It opens only on a valid link; a wrong or expired one, and one
 * already used, get their own closing screen.
 */
export function FeedbackPublicPage({ token }: { token: string }) {
  const query = useQuery(publicFeedbackQuery(token));
  const [outcome, setOutcome] = useState<'sent' | PublicProblem | null>(null);
  const invalid = query.error instanceof ApiError && query.error.status < 500;
  const closing = outcome === 'sent' ? 'sent' : outcome === 'already' || query.data?.alreadySubmitted ? 'already' : invalid || outcome === 'invalid' ? 'invalid' : null;

  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Cartouche>{t.feedback.title}</Cartouche>
          <LanguageSwitch />
        </div>
        {query.isPending && <p className="py-6 text-center text-ink-3">{t.feedback.loading}</p>}
        {query.isError && !invalid && (
          <div className="grid gap-3">
            <FormAlert>{t.feedback.loadFailed}</FormAlert>
            <Button variant="secondary" onClick={() => void query.refetch()} className="justify-self-start">
              {t.feedback.retry}
            </Button>
          </div>
        )}
        {closing && <ThankYou kind={closing} />}
        {query.data && !closing && <FeedbackForm token={token} form={query.data} onDone={setOutcome} />}
      </div>
    </main>
  );
}
