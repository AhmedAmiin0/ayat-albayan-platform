import type {
  TranslationKeyParams,
  TranslationKeysPage,
  TranslationKeysQueryInput,
  TranslationValue,
} from '@ab/i18n';

export interface TranslationCalls {
  keys: (query: TranslationKeysQueryInput) => Promise<TranslationKeysPage>;
  save: (params: TranslationKeyParams, body: TranslationValue) => Promise<undefined>;
  restore: (params: TranslationKeyParams) => Promise<undefined>;
}
