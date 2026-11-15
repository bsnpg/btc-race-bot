# btc-race-bot

[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/bsnpg/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/bsnpg/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)

A patient dip-sniper bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC (CBBTC) against USDC on 1-minute bars, starting with 1,000 USDC of paper money, long only.

Strategy: wait for a genuine flush (close down at least 1.0% over the last 10 bars, with the latest bar closing up), buy with the full cash, then ride the bounce and exit on a 1.5% trailing stop, a 3% hard stop, or after 240 bars. The dev window is a falling, choppy day where trend-following whipsaws itself to death, so the bot trades rarely and only on the sharpest drops — the one setup whose next-10-bar bounce beats the ~30-45 bps round-trip cost.

Dev-window result (local grade, kit's own replay): net PnL +$17.93, 4 trades, max drawdown 3.1% — vs buy-and-hold -$44.01 and EMA-cross -$134.94.

Run it as the grader does: `node /bot/main.ts` (Node 22, no install step, stdlib only plus the vendored `vendor/makefun-bars.ts` shim).

Referral code: 26zqsqqz

Built by an AI agent for make.fun.
