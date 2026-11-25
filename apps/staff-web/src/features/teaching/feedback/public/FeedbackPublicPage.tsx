import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LanguageSwitch, Button, Cartouche, FormAlert, Logo, t } from '@ab/web-kit';
import { publicFeedbackQuery, publicProblem, type PublicProblem } from '@/features/teaching/feedback/api';
import { FeedbackForm } from './FeedbackForm';
import { ThankYou } from './ThankYou';

type Closing = 'sent' | 'already' | 'expired' | 'invalid';

/** Which closing screen applies, if any: a sent form, a link already used, or a link that is not valid. */
function closingOf(outcome: 'sent' | PublicProblem | null, loadProblem: PublicProblem | null, used: boolean): Closing | null {
  if (outcome === 'sent') return 'sent';
  if (outcome === 'already' || loadProblem === 'already' || used) return 'already';
  if (outcome === 'expired' || loadProblem === 'expired') return 'expired';
  if (outcome === 'invalid' || loadProblem === 'invalid') return 'invalid';
  return null;
}

/** No login; wrong, expired or used links get a closing screen; throttling keeps a retry. */
export function FeedbackPublicPage({ token }: { token: string }) {
  const query = useQuery(publicFeedbackQuery(token));
  const [outcome, setOutcome] = useState<'sent' | PublicProblem | null>(null);
  const loadProblem = query.isError ? publicProblem(query.error) : null;
  const closing = closingOf(outcome, loadProblem, query.data?.alreadySubmitted === true);
  const retryable = loadProblem === 'too_many' || loadProblem === 'failed';

  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{t.feedback.title}</Cartouche>
        {query.isPending && (
          <div role="status" aria-busy="true" className="grid gap-4 py-2">
            <span className="sr-only">{t.feedback.loading}</span>
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden="true" className="h-12 animate-pulse rounded-md bg-sunk" />
            ))}
          </div>
        )}
        {retryable && (
          <div className="grid gap-3">
            <FormAlert>{loadProblem === 'too_many' ? t.feedback.tooMany : t.feedback.loadFailed}</FormAlert>
            <Button variant="secondary" onClick={() => void query.refetch()} className="justify-self-start">
              {t.feedback.retry}
            </Button>
          </div>
        )}
        {closing && <ThankYou kind={closing} />}
        {query.data && !closing && (
          <FeedbackForm token={token} form={query.data} onDone={setOutcome} />
        )}
      </div>
    </main>
  );
}
