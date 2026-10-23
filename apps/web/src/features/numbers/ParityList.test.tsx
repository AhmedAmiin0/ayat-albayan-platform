import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { PARITY_DIFF, PARITY_SAME } from './numbers.fixture';
import { ParityList } from './ParityList';

const p = t.numbers.parity;

describe('«مطابقة الإعداد»', () => {
  it('no differences: «مطابق» and nothing listed', () => {
    render(<ParityList parity={PARITY_SAME} />);
    expect(screen.getByText(p.empty)).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('differences: count, then per role each differing field with its state and both values; secrets never shown', () => {
    render(<ParityList parity={PARITY_DIFF} />);
    expect(screen.getByText(p.count.replace('{{count}}', '2'))).toBeTruthy();
    const role = screen.getByRole('region', { name: t.numbers.purpose.notifications });
    const items = within(role).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-field'))).toEqual(['waba_id', 'access_token']);
    const [waba, token] = items as [HTMLElement, HTMLElement];
    expect(within(waba).getByText(t.numbers.fields.waba_id)).toBeTruthy();
    expect(within(waba).getByText(`(${p.state.different})`)).toBeTruthy();
    expect(within(waba).getByText('2000000009')).toBeTruthy();
    expect(within(waba).getByText('2000000001')).toBeTruthy();
    expect(within(token).getByText(`(${p.state.missing})`)).toBeTruthy();
    expect(within(token).getByText(p.secretSet)).toBeTruthy();
    expect(within(token).queryByText('set')).toBeNull();
    expect(within(role).getByText('Notifications line')).toBeTruthy();
  });
});
