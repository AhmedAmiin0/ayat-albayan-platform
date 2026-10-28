import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { NoCommissionNote } from './NoCommissionNote';

// Owner 2026-10-28: «If the course already started so dont give commission».
const NOW = new Date('2026-11-01T09:00:00Z'); // 12:00 in Riyadh
const note = () => screen.queryByText(t.salesMoney.noCommissionStarted);

describe('NoCommissionNote', () => {
  it('a first day before today (Riyadh): shown', () => {
    render(<NoCommissionNote startsOn="2026-10-31" usedBefore={0} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('lessons used before: shown even on today', () => {
    render(<NoCommissionNote startsOn="2026-11-01" usedBefore={2} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('today or a future day: nothing', () => {
    const { rerender } = render(<NoCommissionNote startsOn="2026-11-01" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
    rerender(<NoCommissionNote startsOn="2026-11-03" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
  });
});
