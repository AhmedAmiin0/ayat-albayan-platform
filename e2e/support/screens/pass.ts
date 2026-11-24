import type { Page } from '@playwright/test';
import { landedOn, save, settle, variantPage } from './capture.ts';
import { shootDialogs } from './dialogs.ts';
import { DIALOG_VARIANTS } from './plan.ts';
import type { IndexEntry, Job, Pass, Target, Variant } from './screens.types.ts';

const wantsDialogs = (pass: Pass, variant: Variant): boolean =>
  pass.dialogs && DIALOG_VARIANTS.includes(variant);

/** Opens the target; a guard that sends this role elsewhere means the role cannot reach it. */
async function visit(page: Page, input: { job: Job; target: Target }): Promise<string | null> {
  const { job, target } = input;
  const opened = await page
    .goto(`${job.base}${target.url}`, { timeout: 30_000 })
    .then(() => settle(page))
    .then(() => null)
    .catch((error: unknown) => `did not load: ${String(error).split('\n')[0] ?? ''}`);
  if (opened) return opened;
  const at = landedOn(page);
  return at === target.url ? null : `redirected to ${at}`;
}

async function shootTarget(job: Job, input: { page: Page; target: Target; variant: Variant }) {
  const { page, target, variant } = input;
  const entry: Omit<IndexEntry, 'file'> = {
    app: job.app,
    role: job.role,
    route: target.route,
    url: target.url,
    variant: variant.name,
    reached: target.how,
  };
  return save(job, { page, entry });
}

async function visitAndShoot(job: Job, input: { pass: Pass; variant: Variant; target: Target }) {
  const { pass, variant, target } = input;
  const page = await variantPage(job, variant);
  const problem = await visit(page, { job, target });
  if (problem) return problem;
  const entry = await shootTarget(job, { page, target, variant });
  if (wantsDialogs(pass, variant)) await shootDialogs(job, { page, entry });
  return null;
}

/**
 * One target in its own context, closed afterwards: one page reused over a whole role's routes
 * grew until the renderer crashed. A page that crashes is listed as skipped, with the error.
 */
async function oneTarget(job: Job, input: { pass: Pass; variant: Variant; target: Target }) {
  const contexts = job.browser.contexts().length;
  const problem = await visitAndShoot(job, input).catch(
    (error: unknown) => `crashed: ${String(error).split('\n')[0] ?? ''}`,
  );
  await Promise.all(
    job.browser
      .contexts()
      .slice(contexts)
      .map((c) => c.close()),
  );
  return problem;
}

/** One variant over the targets; returns the ones this role reached. */
async function runVariant(job: Job, input: { pass: Pass; variant: Variant; targets: Target[] }) {
  const { pass, variant } = input;
  const reached: Target[] = [];
  for (const target of input.targets) {
    const problem = await oneTarget(job, { pass, variant, target });
    if (problem) {
      pass.skipped.push({ app: job.app, role: job.role, route: target.route, reason: problem });
      continue;
    }
    reached.push(target);
  }
  return reached;
}

/**
 * Every variant of every target as this job's role. The first variant probes: a page the role
 * cannot reach is listed as skipped and not tried again in the other variants.
 */
export async function runPass(job: Job, pass: Pass): Promise<void> {
  const [first, ...rest] = pass.variants;
  if (!first) return;
  const reached = await runVariant(job, { pass, variant: first, targets: pass.targets });
  for (const variant of rest) {
    await runVariant(job, { pass: { ...pass, skipped: [] }, variant, targets: reached });
  }
}
