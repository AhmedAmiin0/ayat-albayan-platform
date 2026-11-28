import { useId } from 'react';
import type { CheckboxView } from './Checkbox.types';

export function useCheckbox(): CheckboxView {
  return { hintId: useId() };
}
