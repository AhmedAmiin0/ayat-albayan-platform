import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageBubble } from '@/features/messaging/inbox/messages/components/MessageBubble';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

vi.mock('@/lib/http/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch: vi.fn(),
  apiSend: vi.fn(),
}));

// WhatsApp's edits and deletes (owner 2026-10-30): never a «[edit]» / «[revoke]» bubble; the
// original shows its new text with «تم التعديل», or only «تم حذف هذه الرسالة».
const NOW = new Date('2026-10-01T12:00:00Z');

function bubble(patch: Partial<MessageView>) {
  renderWithClient(
    <ul>
      <MessageBubble
        message={message({ direction: 'outbound', ...patch })}
        waitingTemplate={false}
        now={NOW}
      />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble: edited and deleted', () => {
  it('an edited message shows its new text and «تم التعديل»', () => {
    const b = bubble({ body: 'الحلقة الساعة 6', edited: true });
    expect(b.textContent).toContain('الحلقة الساعة 6');
    expect(b.textContent).toContain(t.inbox.edited);
  });

  it('an unedited one has no label', () => {
    expect(bubble({ body: 'السلام عليكم' }).textContent).not.toContain(t.inbox.edited);
  });

  it('a deleted message (ours or theirs) shows only «تم حذف هذه الرسالة»', () => {
    const gone = {
      body: null,
      media_mime: null,
      media_url: null,
      interactive_payload: null,
      deleted: true,
    };
    const b = bubble({ ...gone, direction: 'inbound' });
    expect(b.textContent).toContain(t.inbox.deletedMessage);
    expect(b.textContent).not.toContain(t.inbox.media.other);
  });
});

describe('MessageBubble: the ad’s welcome and an unsupported echo', () => {
  it('the welcome shows its own text when stored, else the label', () => {
    const own = bubble({
      body: null,
      interactive_payload: { type: 'errors', welcome: 'أهلًا بك' },
    });
    expect(own.textContent).toContain('أهلًا بك');
  });

  it('without its text: «رسالة الترحيب من الإعلان»', () => {
    const label = bubble({ body: null, interactive_payload: { type: 'errors', welcome: null } });
    expect(label.textContent).toContain(t.inbox.adWelcome);
  });

  it('an unsupported echo: «رسالة غير مدعومة», never «[unsupported]»', () => {
    const b = bubble({ body: null, interactive_payload: { type: 'unsupported' } });
    expect(b.textContent).toContain(t.inbox.unsupportedEcho);
    expect(b.textContent).not.toContain('[');
  });
});
