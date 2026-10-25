import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from './inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { renderWithClient } from './test-utils';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const NOW = new Date('2026-10-01T12:00:00Z');
const SARA = t.inbox.sentBy.replace('{name}', 'سارة');

function renderBubble(patch: Partial<MessageView>) {
  renderWithClient(
    <ul>
      <MessageBubble message={message({ direction: 'outbound', status: 'sent', body: 'أهلًا', ...patch })} waitingTemplate={false} now={NOW} />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble: who sent ours (D4)', () => {
  it('an assistant’s row shows «أرسلها: سارة»', () => {
    const bubble = renderBubble({ sender_name: 'سارة', automatic: false });
    expect(bubble.textContent).toContain(SARA);
    expect(bubble.textContent).not.toContain(t.inbox.automaticMessage);
  });

  it('a job’s row shows «رسالة تلقائية»', () => {
    const bubble = renderBubble({ sender_name: null, automatic: true });
    expect(bubble.textContent).toContain(t.inbox.automaticMessage);
  });

  it('an old row with only sent_by_teacher_name still names the teacher', () => {
    const bubble = renderBubble({ sent_by_teacher_name: 'أبرار' });
    expect(bubble.textContent).toContain(t.inbox.sentBy.replace('{name}', 'أبرار'));
  });

  it('imported history and inbound rows show neither', () => {
    const history = renderBubble({ sender_name: null, automatic: false });
    expect(history.textContent).not.toContain(t.inbox.automaticMessage);
    expect(history.textContent).not.toContain(t.inbox.sentBy.replace('{name}', ''));
    document.body.innerHTML = '';
    const inbound = renderBubble({ direction: 'inbound', sender_name: 'سارة', automatic: true });
    expect(inbound.textContent).not.toContain(SARA);
    expect(inbound.textContent).not.toContain(t.inbox.automaticMessage);
  });
});
