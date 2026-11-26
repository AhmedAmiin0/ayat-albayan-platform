import { pathKey } from '../../core/keys';
import type { PriceListKeys } from './price-list.types';

export const PRICE_LIST_PATH = '/pricing/list';

const all = pathKey(PRICE_LIST_PATH);

export const priceListKeys: PriceListKeys = {
  all,
  of: (params) => [...all, params],
};
