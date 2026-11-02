import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { CopyPhoneButton } from './CopyPhoneButton';

describe('«نسخ الرقم» in the chat header', () => {
  it('copies the number in E.164 and says «نُسِخ»', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CopyPhoneButton phone={PHONE} />);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.copy.phone }));
    expect(writeText).toHaveBeenCalledWith(PHONE);
    expect(await screen.findByText(t.inbox.copy.done)).toBeTruthy();
  });
});
