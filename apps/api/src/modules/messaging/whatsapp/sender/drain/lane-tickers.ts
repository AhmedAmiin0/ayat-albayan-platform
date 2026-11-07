import { Ticker } from '@/common/jobs';
import { KickFlag } from '@/modules/messaging/whatsapp/sender/pass';
import { SENDER_FIRST_RUN_MS, SENDER_POLL_MS } from '@/modules/messaging/whatsapp/sender/sender-timing';
import { lanesOf, type Lane } from './lanes';

/** One lane's pass; `kicked` = a kick (not a timer) asked for it. */
type LaneRun = (lane: Lane, kicked: boolean) => Promise<unknown>;

/**
 * docs/42 42-7: a single-flight ticker per lane, each with its own timers (30 s; a tick in a run
 * queues one more, as an enqueue does), so a chat retry, an expired lease or a released held text
 * never waits behind a main run. A kick names its lane, or both.
 */
export class LaneTickers {
  private readonly kicked: Record<Lane, KickFlag> = { chat: new KickFlag(), main: new KickFlag() };
  private readonly tickers: Record<Lane, Ticker>;
  private readonly lanes: readonly Lane[] = ['chat', 'main'];

  constructor(name: string, run: LaneRun) {
    const ticker = (lane: Lane) =>
      new Ticker({
        name: `${name}:${lane}`, firstMs: SENDER_FIRST_RUN_MS, everyMs: SENDER_POLL_MS, timer: 'kick',
        run: () => run(lane, this.kicked[lane].take()),
      });
    this.tickers = { main: ticker('main'), chat: ticker('chat') };
  }

  start(timing: { firstMs: number; everyMs: number }): void {
    this.lanes.forEach((lane) => this.tickers[lane].start(timing));
  }

  stop(): void {
    this.lanes.forEach((lane) => this.tickers[lane].stop());
  }

  /** The named lane (or both); settles once each kicked lane's queued run is done. */
  async kick(lane: string | undefined): Promise<void> {
    const lanes = lanesOf(lane);
    lanes.forEach((l) => this.kicked[l].set());
    await Promise.all(lanes.map((l) => this.tickers[l].kick()));
  }
}
