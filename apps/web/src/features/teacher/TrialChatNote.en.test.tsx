import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrialChatNote } from './TrialChatNote';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));

describe('TrialChatNote, English', () => {
  it('a trial student: the note reads in English', () => {
    render(<TrialChatNote status="trial" />);
    expect(screen.getByRole('note').textContent).toBe('Contact with a trial student’s family goes through sales.');
  });
});
