import type { CallView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { CallEntry } from './CallEntry';

const call = (over: Partial<CallView> = {}): CallView => ({
  ...{ id: 'c1', phone_e164: '+966501234567', direction: 'outbound', status: 'ended', end_reason: 'completed', display_name: 'أم سهيلة' },
  ...{ staff_id: 's1', started_at: '2026-10-26T10:00:00Z', answered_at: '2026-10-26T10:00:05Z', ended_at: '2026-10-26T10:02:19Z', duration_seconds: 134 },
  ...over,
});

describe('CallEntry (a call in the chat)', () => {
  it('names each kind WhatsApp-like, with the talk time when answered', async () => {
    await render(<CallEntry call={call()} />);
    expect(screen.getByText(`${t.calls.entry.outgoing} · 2:14`)).toBeTruthy();
    await render(<CallEntry call={call({ id: 'c2', direction: 'inbound', end_reason: 'missed', duration_seconds: null })} />);
    expect(screen.getByText(t.calls.entry.missed)).toBeTruthy();
    await render(<CallEntry call={call({ id: 'c3', end_reason: 'no_answer', duration_seconds: null })} />);
    expect(screen.getByText(t.calls.entry.unanswered)).toBeTruthy();
  });

  it('a tap calls back; without a call-back it is plain text', async () => {
    const back = jest.fn();
    await render(<CallEntry call={call()} onCallBack={back} />);
    await fireEvent.press(screen.getByLabelText(`${t.calls.entry.outgoing} · 2:14 — ${t.calls.callBack}`));
    expect(back).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    await render(<CallEntry call={call()} />);
    expect(screen.getByTestId('call-entry-c1')).toBeDisabled();
  });
});
