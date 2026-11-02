import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANT } from '@/features/people/assistants/fixtures';
import { TermsEditor } from './TermsEditor';

// «عمولة التجديد» off (owner 2026-11-01): the API sends renewal_share_percent 0 and the hint
// says it is paused.
const T = t.assistants.terms;
const withShare = (share: number) => ({
  ...ASSISTANT,
  terms: { ...ASSISTANT.terms, renewal_share_percent: share },
});
const renderWith = (share: number) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TermsEditor assistant={withShare(share)} />
    </QueryClientProvider>,
  );

describe('TermsEditor renewal hint', () => {
  it('share 0: «عمولة التجديد موقوفة», never «0%»', () => {
    renderWith(0);
    expect(screen.getByText(T.hintRenewalOff)).toBeTruthy();
    expect(screen.queryByText(T.hint.replace('{n}', '0'))).toBeNull();
  });

  it('a share: the hint names it', () => {
    renderWith(40);
    expect(screen.getByText(T.hint.replace('{n}', '40'))).toBeTruthy();
    expect(screen.queryByText(T.hintRenewalOff)).toBeNull();
  });
});
