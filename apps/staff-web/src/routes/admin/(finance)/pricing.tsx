import { createFileRoute } from '@tanstack/react-router';
import { PricingPage } from '@/features/finance/pricing/PricingPage';

export const Route = createFileRoute('/admin/(finance)/pricing')({
  component: PricingPage,
});
