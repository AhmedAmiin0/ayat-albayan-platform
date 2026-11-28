import type { Pull, Run, YieldFacts } from '../yield.schemas.ts';

export const REPO = 'o/r';
export const SELF = { run: 100, pr: 1, repo: REPO };

export const aRun = (over: Partial<Run> = {}): Run => ({
  id: 200,
  event: 'pull_request',
  head_branch: 'feature/x',
  head_repository: REPO,
  ...over,
});

export const aPull = (over: Partial<Pull> = {}): Pull => ({
  number: 2,
  head: 'feature/x',
  repo: REPO,
  labels: [],
  ...over,
});

/** This run's own PR (#1, not priority) and nothing else queued or running. */
export const aYieldFacts = (over: Partial<YieldFacts> = {}): YieldFacts => ({
  runs: [aRun({ id: SELF.run, head_branch: 'feature/self' })],
  pulls: [aPull({ number: SELF.pr, head: 'feature/self' })],
  ...over,
});
