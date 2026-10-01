import { createFileRoute } from '@tanstack/react-router';
import { PricingPage } from '@/features/pricing/PricingPage';

/** /admin/pricing — the staff price calculator «حاسبة الأسعار» (docs/08). */
export const Route = createFileRoute('/admin/pricing')({
  component: PricingPage,
});
