import { pricingRoutes } from '@ab/shared';
import { pathKey } from '../../core/keys';
import type { PriceListKeys } from './price-list.types';

const all = pathKey(pricingRoutes.list.path);

export const priceListKeys: PriceListKeys = {
  all,
  of: (params) => [...all, params],
};
