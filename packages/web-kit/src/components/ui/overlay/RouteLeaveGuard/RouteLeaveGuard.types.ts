export interface RouteLeaveGuardProps {
  /** Something would be lost: leaving for another page (or closing the tab) asks first. */
  when: boolean;
  words: { title: string; body: string; stay: string; leave: string };
}
