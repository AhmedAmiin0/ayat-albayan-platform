import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { CallEntry } from './CallEntry';
import { call, callSides } from './call-entry.helpers';

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

  // Arabic (jest.setup: RTL): flex-end is the left, so ours sits on the left and the family's on the right.
  it("sits on the caller's side as the bubbles: ours at the inline-end, theirs at the start", async () => {
    expect(await callSides()).toEqual({ ours: 'flex-end', theirs: 'flex-start' });
  });
});
