import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TrialHistoryTable } from './TrialHistoryTable';
import { history, row } from '@/features/teaching/booking/trial-date/trial-fixture';

// The UI in English: column names, outcome words and the family line read in English.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('reads in English', () => {
  render(<TrialHistoryTable history={history({ family_tz: 'Europe/London', items: [row({ outcome: 'attended', picked_by: null })] })} />);
  expect(screen.getByRole('columnheader', { name: 'Picked by' })).toBeTruthy();
  expect(screen.getByText('Attended')).toBeTruthy();
  expect(screen.getByText('Family time: Monday 5 October 15:00')).toBeTruthy();
  expect(screen.getByText(/^Unknown, /)).toBeTruthy();
});
