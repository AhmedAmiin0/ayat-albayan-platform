import { t } from '@ab/web-kit/lib/i18n/i18n';

export const required = ({ value }: { value: string }) =>
  value.trim() ? undefined : t.common.required;
