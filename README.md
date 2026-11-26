# tidewing-beacon-patrol

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Winter075/tidewing-beacon-patrol/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Winter075/tidewing-beacon-patrol/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Fly a bush plane over the Lantern Isles at dawn: thread five beacon gates, drop supplies on Cedar Keys, or answer the light on Lantern Rock, then bring the aircraft back to Marrow Quay. The game runs from static files in a desktop browser and makes no network request.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 and click a sortie. W/S pitch, A/D bank, Q/E rudder, Shift/Ctrl throttle, C switches between chase and cockpit, Space drops the crate. The mouse also steers when you move it.

The entrypoint `main.ts` copies `game/` and `screenshots/` into `/output` and writes `dossier.json`. Locally: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tamdp7j6&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
