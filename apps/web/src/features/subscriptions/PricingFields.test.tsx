import { DISCOUNTS } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { INITIAL_PRICING } from './pricing-form';
import { PricingFields } from './PricingFields';

describe('PricingFields discount', () => {
  it('admin: a free 0–100 number, no pills', () => {
    const set = vi.fn();
    render(<PricingFields form={INITIAL_PRICING} set={set} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: t.subscriptions.discount }), { target: { value: '23' } });
    expect(set).toHaveBeenCalledWith({ discount: 23 });
    expect(screen.queryByRole('group', { name: t.subscriptions.discount })).toBeNull();
  });

  it('with discounts: only those pills, the chosen one pressed, no number input', () => {
    const set = vi.fn();
    render(<PricingFields form={{ ...INITIAL_PRICING, discount: 5 }} set={set} discounts={DISCOUNTS} />);
    expect(screen.queryByRole('spinbutton', { name: t.subscriptions.discount })).toBeNull();
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(3);
    expect(screen.getByRole('button', { pressed: true }).textContent).toBe(t.pricing.discounts['5']);
    fireEvent.click(screen.getByRole('button', { name: t.pricing.discounts['15'] }));
    expect(set).toHaveBeenCalledWith({ discount: 15 });
  });
});
