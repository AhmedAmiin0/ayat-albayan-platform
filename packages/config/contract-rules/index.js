import { noApiPathLiteralRule } from './no-api-path-literal.js';
import { routeFromContractRule } from './route-from-contract.js';

export { noApiPathLiteralRule, routeFromContractRule };

export const contractRules = {
  'route-from-contract': routeFromContractRule,
  'no-api-path-literal': noApiPathLiteralRule,
};
