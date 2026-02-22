# Project DAD

Browser RPG built for GitHub Pages hosting.

## Core Design Implemented
- 11 total levels:
- Levels 1-10: 2.0km each, mini-boss markers at 500m/1000m/1500m, big boss at end.
- Level 11: final boss trial.
- Level cap: 10.
- You gain exactly +1 level only when all 3 mini-bosses and the big boss are defeated in a level.
- Start line gate: each level begins with a start line; players must cross it to begin enemy spawns and the journey timer.
- Low-tier enemies spawn every 13m and drop health/mana pickups.
- Medieval Greece visual theme.
- Character creator:
- Skin tone, facial features, hair, build (S/M/L), sex (M/F/0), height (S/M/L).
- Each trash enemy stochastically resists exactly one attack type: sword, fireball, shield, or arrow.
- Weapon/ability kit: sword, fireball, shield bash, arrow.
- Co-play toggle:
- Adds second player and makes enemies 2.1x harder.
- Mini-bosses are stronger and are constrained to a clear 50m combat border (+/-25m from their spawn point).
- +Mode:
- Unlocks after full game clear, keeps earned level between runs.
- Pause menu includes high-score board.
- Desktop and mobile-friendly controls.

## Perk Ladder (Levels 1-10)
- 1. Sprint unlocked (`Space`)
- 2. Throwing knives: arrow damage x2
- 3. Dual wielding swords: sword damage x2
- 4. Sidekick: friendly NPC deals 10% enemy max HP every 3 seconds
- 5. Fireball V: fireball damage x5 and mana cost x2
- 6. +25% max health
- 7. Explodable TNT arrows: arrow damage x6 with area effect
- 8. +25% max mana
- 9. +50% movement speed
- 10. Friendly baby dragon breath: deletes trash enemies

## Controls
- Desktop:
- P1 movement: `WASD`
- P1 sprint: `Space` (after perk 1)
- P1 attacks: `J` sword, `I` fireball, `K` shield bash, `L` arrow
- P1 heal: `H` (mana-cost instant heal)
- P2 movement (co-op): `Arrow Keys`
- P2 attacks (co-op): `6 7 8 9`
- Pause/Resume: `Esc`
- Mobile:
- Touch move pad (left)
- Touch attack buttons (right)
- On-screen `SPRINT`, `HEAL`, and `PAUSE`

## Play Static Page
Live GitHub Pages build:
[https://brandonlines.github.io/PROJECT-DAD/](https://brandonlines.github.io/PROJECT-DAD/)

## Run (Development)
Serve the project as static files:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy To GitHub Pages
1. Create a GitHub repository.
2. Push these files to the default branch.
3. In repository settings, open **Pages**.
4. Set source to **Deploy from a branch**.
5. Select your branch (usually `main`) and root folder `/`.
6. Save and wait for deployment.

Your game will be available at:
`https://<username>.github.io/<repo-name>/`
