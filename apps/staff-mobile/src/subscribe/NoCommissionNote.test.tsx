import { render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { NoCommissionNote } from './NoCommissionNote';

// A course that already started earns no commission.
const NOW = new Date('2026-11-01T09:00:00Z'); // 12:00 in Riyadh
const note = () => screen.queryByText(t.salesMoney.noCommissionStarted);

describe('NoCommissionNote', () => {
  it('a first day before today (Riyadh): shown', async () => {
    await render(<NoCommissionNote startsOn="2026-10-31" usedBefore={0} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('lessons used before: shown even on today', async () => {
    await render(<NoCommissionNote startsOn="2026-11-01" usedBefore={2} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('today or a future day: nothing', async () => {
    const { rerender } = await render(<NoCommissionNote startsOn="2026-11-01" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
    await rerender(<NoCommissionNote startsOn="2026-11-03" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
  });
});
