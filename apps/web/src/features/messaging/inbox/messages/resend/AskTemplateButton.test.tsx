import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { useTemplateOnAsk } from '@/features/messaging/inbox/composer/lib/use-reply-target';
import { ChatActionsProvider } from '@/features/messaging/inbox/shared/ChatActionsProvider';
import { message, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { AskTemplateButton } from './AskTemplateButton';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// Owner 2026-10-31: a text tried after the 24 h window that WhatsApp refused (131047, final).
const refused = message({ direction: 'outbound', status: 'failed', error_code: '131047' });

/** Stands in for the composer: counts the asks it follows (useTemplateOnAsk). */
function Composer() {
  const [asks, setAsks] = useState(0);
  useTemplateOnAsk(() => setAsks((n) => n + 1));
  return <output aria-label="asks">{asks}</output>;
}

function show(m: MessageView, enabled = true) {
  renderWithClient(
    <ChatActionsProvider thread={thread({ session_open: false })} enabled={enabled}>
      <AskTemplateButton message={m} />
      <Composer />
    </ChatActionsProvider>,
  );
}
const ask = () => screen.queryByRole('button', { name: t.inbox.composer.sendTemplate });

describe('AskTemplateButton', () => {
  it('under a refused text: «أرسل قالبًا» switches the composer to its templates', () => {
    show(refused);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    expect(screen.getByLabelText('asks').textContent).toBe('1');
  });

  it('none for another failure, a sent text, or a chat she cannot write in', () => {
    show(message({ direction: 'outbound', status: 'failed', error_code: '131026' }));
    show(message({ direction: 'outbound', status: 'sent', error_code: null }));
    show(refused, false);
    expect(ask()).toBeNull();
  });
});
