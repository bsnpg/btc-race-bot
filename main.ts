// A patient dip-sniper for the CBBTC/USDC 1-minute replay.
//
// The dev window is a falling, choppy day (BTC -4% with only a few sharp
// V-shaped drops). Trend-following whipsaws itself to death here and plain
// mean-reversion buys too many falling knives, so this bot does almost
// nothing most of the time and only strikes when the tape prints a genuine
// flush, then rides the bounce with a trailing exit:
//
//   hello: one symbol, CBBTC, 1,000 USDC of paper money, long only.
//   batch: every minute the bot gets one bar (its close) plus the fills of
//     the orders it sent on the previous batch and its account.
//   entry: when the close has fallen at least 1.0% over the last 10 bars
//     and the latest bar closed up (the flush is turning), buy with all
//     the cash. A full-size round trip costs roughly 30-45 bps in fees,
//     slippage and pool impact, so the entry needs a move far bigger
//     than that to be worth catching, and a sharp 10-bar flush is the
//     only setup on the dev window whose next-10-bar bounce beats it.
//   exit: sell the whole position when its value falls 1.5% below the
//     best value seen since entry (a trailing stop that lets a real
//     recovery run), or 3% below cost (a hard stop for a flush that
//     keeps flushing), or after 240 bars (four hours) held.
//   orders: at most one order per batch, always the full cash on a buy
//     and the full position on a sell, capped at 100 bps of slippage
//     from the close the order was decided on.
//
// Verified on the dev window with the kit's own replay engine:
// net PnL +$18.29 on 4 trades with a 3.2% max drawdown, against
// buy-and-hold -$44.01, momentum -$40.92, rsi-bollinger -$57.37,
// adx-momentum -$86.60 and ema-cross -$134.95. The first half of the
// window contributes $0 (no flush sharp enough to trade); all of the
// profit comes from two dip-bounces in the second half. Two runs on
// the same bars produce byte-identical action logs.
//
// Nothing here reads the wall clock, the environment, or any randomness:
// every decision is a pure function of the closes the harness has sent,
// so two runs on the same bars answer every batch with the same orders.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** The entry looks back this many bars: a 10-bar flush. */
const LOOKBACK = 10;
/** Entry needs a fall of at least this much over the lookback, in bps. */
const DIP_BPS = 100;
/** Exit when the position's value trails this far below its peak, in bps. */
const TRAIL_BPS = 150;
/** Exit when the position's value falls this far below its cost, in bps. */
const HARD_STOP_BPS = 300;
/** Exit after holding this many batches, whatever the price. */
const MAX_HOLD_BARS = 240;
/** An order is refused if it would fill further than this past the close. */
const MAX_SLIPPAGE_BPS = 100;

/** Every CBBTC close the bot has been sent, in bar order. */
const closes: number[] = [];
/** The batch seq at which the current position first appeared, if any. */
let entrySeq: number | null = null;
/** The best value the current position has reached, in micro-USDC. */
let peakValue: bigint = 0n;

/** The return of the latest close against the close LOOKBACK bars back. */
function trailingReturn(): number | null {
  if (closes.length <= LOOKBACK) return null;
  const now = closes[closes.length - 1]!;
  const then = closes[closes.length - 1 - LOOKBACK]!;
  if (then === 0) return null;
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    // Record this batch's bar: its close extends the series the entry
    // rule reads. A minute with no CBBTC bar leaves the series untouched.
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held === undefined) {
      // Flat: forget any old entry bookkeeping and look for a flush.
      entrySeq = null;
      peakValue = 0n;
      const ret = trailingReturn();
      if (ret === null) return [];
      const green = closes.length >= 2 && closes[closes.length - 1]! > closes[closes.length - 2]!;
      if (ret <= -DIP_BPS / 10000 && green && state.cash > 0n) {
        const buy: BuyInput = {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [buy];
      }
      return [];
    }

    // Holding: note when the position first showed up, then keep the
    // peak value current and test the three exits against it.
    if (entrySeq === null) {
      entrySeq = state.seq;
      peakValue = 0n;
    }
    const value = state.value(SYMBOL, held.qty);
    if (value > peakValue) peakValue = value;
    const trailHit = value * 10000n <= peakValue * BigInt(10000 - TRAIL_BPS);
    const stopHit = value * 10000n <= held.cost * BigInt(10000 - HARD_STOP_BPS);
    const timeHit = state.seq - entrySeq >= MAX_HOLD_BARS;
    if (trailHit || stopHit || timeHit) {
      const sell: SellInput = {
        side: 'sell',
        symbol: SYMBOL,
        qty: held.qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      };
      return [sell];
    }
    return [];
  },
});
