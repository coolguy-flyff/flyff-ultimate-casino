# Ultimate Casino

The high-limit room upstairs from the [Blessing Casino](https://github.com/coolguy-flyff/flyff-blessing-casino):
a Flyff Universe **ultimate weapon reroll simulator**. Pick one of the 83 ultimate
weapons, set its upgrade level, name your dream lines, and feed it scrolls until the
numbers are pretty or the (hypothetical) wallet gives out.

## How it plays

1. **Choose your weapon** — search the full ultimate weapon roster (data straight from
   the live game files). Pick the upgrade level: orange ultimate lines open at **+6**,
   the second one at **+10**.
2. **The exchange desk** — scrolls are fCoin cash-shop items with fixed prices
   (300 / 1,000 / 1,000 fc). Set your fCoin→Penya rate to feel the loss in your native
   currency; $100 = 11,500 fCoins is the anchor. Scrolls trade player-to-player, so
   the Penya figure is the street value of your habit.
3. **Feed the machine** —
   - **Scroll of Ultimate Power** (300 fc) rerolls *every base line at once* within
     its printed range.
   - **Scroll of Ultimate Bonus** (1,000 fc) rerolls *both yellow ultimate lines*:
     two distinct stats from the weapon's pool, values rolled within range.
   - **Scroll of Ultimate Bonus II** (1,000 fc) rerolls the *orange ultimate lines*
     (half-strength ranges). Disabled below +6.
4. **Pull or chase** — the pull buttons sit right next to the weapon for one scroll
   at a time. Below them, set target stats and minimum values per group (any number
   of base lines, up to two yellow, up to two orange) and hit *Chase* — the machine
   burns scrolls until they all land or the give-up cap saves you. Exact odds and
   expected damage are disclosed before every chase, because this house is honest
   about being a casino.

Every scroll lands in the ledger; the damage report keeps the running total in
fCoins, penya, and real money.

## House rules (the simulation model)

- Rolls are uniform within each printed range — the curves aren't published, so the
  felt assumes the fairest possible table.
- Attack Speed, Critical Damage, Critical Chance, Block Penetration, Lifesteal, and
  Attack roll in 0.1 increments; every other stat rolls whole points.
- Orange ranges are the yellow ranges halved and floored to the stat's increment:
  HP 4~9 → 2~4, Lifesteal 0.8~1.8 → 0.4~0.9.
- Ultimate stats never repeat on one weapon — not within a color, not across yellow
  and orange. Rerolls respect whatever the other color currently holds.
- Reaching +6 / +10 rolls the newly unlocked orange line free of charge; only scrolls
  are billed.

## Project layout

| Path                  | What it is                                                        |
| --------------------- | ----------------------------------------------------------------- |
| `index.html`          | The whole app — no framework, no build step for the page itself.  |
| `data/weapons.js`     | Generated runtime data: the 83 ultimate weapons, stat + skill names. |
| `data-src/`           | Raw Flyffulator data dumps — **not committed** (40MB+), only needed to regenerate `data/weapons.js`. |
| `tools/build-data.mjs`| Regenerates `data/weapons.js` from `data-src/`.                   |

Just open `index.html` in a browser — `data/weapons.js` ships with the repo, so no
build step is needed. Weapon and scroll icons are loaded from
[Flyffipedia](https://flyffipedia.com/), so the pictures need an internet connection;
the math does not.

To regenerate the data (e.g. after a game patch), drop Flyffulator's dumps —
`items.json`, `statnames.json`, `skills.json`, `classes.json` — into `data-src/`
and run:

```sh
node tools/build-data.mjs
```

## Disclaimer

All commentary is satire, for fun only. Not affiliated with Gala Lab — they have
enough of your money already. The prices and the math, regrettably, are real.
