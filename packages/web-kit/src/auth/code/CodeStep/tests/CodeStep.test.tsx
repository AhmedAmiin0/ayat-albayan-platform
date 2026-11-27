import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CodeStep } from '@ab/web-kit/auth/code/CodeStep';
import { useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';

vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));

const send = vi.fn(() => Promise.resolve());
const F = t.familyAuth;

function Harness() {
  const flow = useCodeFlow(send);
  if (flow.target === null) {
    return (
      <button type="button" onClick={() => void flow.request('+201001234567')}>
        go
      </button>
    );
  }
  return (
    <CodeStep
      flow={flow}
      submitLabel="ok"
      busyLabel="…"
      onSubmit={vi.fn()}
      backLabel={F.changePhone}
    />
  );
}

const resendIn = (s: number) => F.resendIn.replace('{seconds}', String(s));
const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });
const box = (n: number) =>
  screen.getByLabelText<HTMLInputElement>(F.codeDigit.replace('{n}', String(n)));

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
  const wait = (seconds: number) => {
    for (let i = 0; i < seconds; i++) void act(() => vi.advanceTimersByTime(1000));
  };

  it('says the code was sent and counts down RESEND_SECONDS before «أعد إرسال الرمز»', async () => {
    await start();
    expect(screen.getByRole('status').textContent).toBe(F.codeSent);
    expect(button(resendIn(60)).disabled).toBe(true);
    wait(59);
    expect(button(resendIn(1)).disabled).toBe(true);
    wait(1);
    expect(button(F.resend).disabled).toBe(false);
    await act(async () => fireEvent.click(button(F.resend)));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('+201001234567');
    expect(button(resendIn(60)).disabled).toBe(true);
  });

  it('as the family app: resend, then «غيّر الرقم», one centred column under the submit', async () => {
    await start();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['ok', resendIn(60), F.changePhone]);
    expect(button(F.changePhone).parentElement?.className).toContain('justify-items-center');
  });

  it('a resend keeps the digits typed meanwhile', async () => {
    await start();
    fireEvent.change(box(1), { target: { value: '12' } });
    wait(60);
    await act(async () => fireEvent.click(button(F.resend)));
    expect(box(1).value).toBe('1');
    expect(box(2).value).toBe('2');
  });

  it('the resend waits while a code is being sent; «غيّر الرقم» does not', async () => {
    await start();
    wait(60);
    send.mockReturnValueOnce(new Promise<void>(() => undefined));
    fireEvent.click(button(F.resend));
    await act(async () => Promise.resolve());
    expect(button(F.resend).disabled).toBe(true);
    expect(button(F.changePhone).disabled).toBe(false);
    // Resending is not verifying: the submit keeps its word (disabled meanwhile).
    expect(button('ok').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: '…' })).toBeNull();
  });

  it('«غيّر الرقم» goes back to the first step', async () => {
    await start();
    fireEvent.click(button(F.changePhone));
    expect(screen.getByRole('button', { name: 'go' })).toBeTruthy();
  });
});
