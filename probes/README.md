# Behavioral probe suites (R5–R21)

Live-drive Playwright probes accumulated across the review campaign — one
suite per fix round, each asserting the behaviors that round fixed plus its
regression controls. 149 assertions total. These are the verification ladder
referenced in the PR's commit messages and review doc.

## Run

```sh
# terminal 1: dev server
bun run --cwd apps/web dev

# terminal 2: one suite / the ladder
PROBE_URL=http://127.0.0.1:5173/ node probes/r21-verify.mjs
for s in probes/r*-verify.mjs; do node "$s" || echo "FAIL $s"; done
```

- `PROBE_URL` — dev server origin (default `http://127.0.0.1:5173/`).
- `PLAYWRIGHT_PATH` — module path to a Playwright install if it isn't
  resolvable from this repo (`npm i -D playwright` or point at any checkout's
  `node_modules/playwright/index.mjs`).

Suites assume the mock fixtures (fixed clock, deterministic generator) and a
fresh page per section — they reset state by reloading, not by cleanup.
Probes are ordered r5…r21; later suites assume earlier rounds' fixes are in.
