import { pricingRoutes } from '@ab/shared';
import type { PriceListKeys } from './price-list.types';

/** The list route's own key: `all` reaches every cached list, `of` is one choice's entry. */
export const priceListKeys: PriceListKeys = pricingRoutes.list.key;
