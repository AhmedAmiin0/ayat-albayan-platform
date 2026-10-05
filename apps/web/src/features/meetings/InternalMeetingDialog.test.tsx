import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { InternalMeetingDialog } from './InternalMeetingDialog';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const L = t.meetings.internal;
const URL = 'https://app.example.test/m/abc';
const writeText = vi.fn();

function open() {
  const onEnter = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InternalMeetingDialog onClose={onClose} onEnter={onEnter} />
    </QueryClientProvider>,
  );
  return { onEnter, onClose };
}

describe('InternalMeetingDialog «اجتماع داخلي»', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
  });

  it('creates with the typed title, shows the link, copies it and enters the room', async () => {
    apiSend.mockResolvedValue({ id: 'm-1', url: URL });
    const { onEnter } = open();
    expect(screen.getByRole('dialog', { name: L.dialogTitle })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(L.title), { target: { value: ' تنسيق الأسبوع ' } });
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(screen.getByLabelText(L.link)).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', { title: 'تنسيق الأسبوع' });
    expect((screen.getByLabelText(L.link) as HTMLInputElement).value).toBe(URL);
    fireEvent.click(screen.getByRole('button', { name: L.copy }));
    await waitFor(() => expect(screen.getByText(L.copied)).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(URL);
    fireEvent.click(screen.getByRole('button', { name: L.enter }));
    expect(onEnter).toHaveBeenCalledWith('m-1');
  });

  it('sends no title when none is typed; an API failure says so', async () => {
    apiSend.mockRejectedValue(new Error('boom'));
    open();
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(screen.getByText(L.error)).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', {});
  });

  it('cancel closes without creating anything', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(onClose).toHaveBeenCalled();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
