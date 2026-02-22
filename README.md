# Project DAD

Browser RPG built for GitHub Pages hosting.

## Core Design Implemented
- 11 total levels:
- Levels 1-10: 2.0km each, mini-boss markers at 500m/1000m/1500m, big boss at end.
- Level 11: final boss trial.
- Level cap: 10.
- You gain exactly +1 level only when all 3 mini-bosses and the big boss are defeated in a level.
- Low-tier enemies spawn every 13m and drop health/mana pickups.
- Medieval Greece visual theme.
- Character creator:
- Skin tone, facial features, hair, build (S/M/L), sex (M/F/0), height (S/M/L).
- Each trash enemy stochastically resists exactly one attack type: sword, fireball, shield, or arrow.
- Weapon/ability kit: sword, fireball, shield bash, arrow.
- Co-play toggle:
- Adds second player and makes enemies 2.1x harder.
- +Mode:
- Unlocks after full game clear, keeps earned level between runs.
- Pause menu includes high-score board.
- Desktop and mobile-friendly controls.

## Controls
- Desktop:
- P1 movement: `WASD`
- P1 attacks: `J` sword, `I` fireball, `K` shield bash, `L` arrow
- P2 movement (co-op): `Arrow Keys`
- P2 attacks (co-op): `6 7 8 9`
- Pause/Resume: `Esc`
- Mobile:
- Touch move pad (left)
- Spell buttons (right)

## Local Run
Open `index.html` directly, or run a static server:

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
