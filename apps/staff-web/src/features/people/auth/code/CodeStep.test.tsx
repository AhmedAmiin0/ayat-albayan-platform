import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CodeStep } from './CodeStep';
import { useCodeFlow } from './use-code-flow';

vi.mock('@/lib/http/api', () => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));

const send = vi.fn(() => Promise.resolve());

function Harness() {
  const flow = useCodeFlow(send);
  if (flow.target === null) {
    return (
      <button type="button" onClick={() => void flow.request('+201001234567')}>
        go
      </button>
    );
  }
  return <CodeStep flow={flow} submitLabel="ok" busyLabel="…" onSubmit={vi.fn()} backLabel={t.familyAuth.changePhone} />;
}

const resendIn = (s: number) => t.familyAuth.resendIn.replace('{seconds}', String(s));

describe('CodeStep resend timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    send.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  async function start() {
    render(<Harness />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'go' })));
  }

  it('says the code was sent and counts down RESEND_SECONDS before «أعد إرسال الرمز»', async () => {
    await start();
    expect(screen.getByRole('status').textContent).toBe(t.familyAuth.codeSent);
    const button = screen.getByRole('button', { name: resendIn(60) }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    for (let i = 0; i < 59; i++) act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: resendIn(1) })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    const resend = screen.getByRole('button', { name: t.familyAuth.resend }) as HTMLButtonElement;
    expect(resend.disabled).toBe(false);
    await act(async () => fireEvent.click(resend));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('+201001234567');
    expect(screen.getByRole('button', { name: resendIn(60) })).toBeTruthy();
  });

  it('«غيّر الرقم» goes back to the first step', async () => {
    await start();
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.changePhone }));
    expect(screen.getByRole('button', { name: 'go' })).toBeTruthy();
  });
});
