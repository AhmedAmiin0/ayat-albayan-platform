import type { Ref } from 'react';
import type { AppTextNode } from '../../../primitives/AppText';

export interface HeaderTitleProps {
  title: string;
  count?: number;
  titleRef?: Ref<AppTextNode>;
}
