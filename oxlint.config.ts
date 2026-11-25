// The one lint config (docs/31b-oxlint-mapping.md). It sits at the root because oxlint roots
// ignores and override globs at the config file's folder; the body lives in @ab/config.
import { repoConfig } from '@ab/config/oxlint';

export default await repoConfig(import.meta.dirname);
