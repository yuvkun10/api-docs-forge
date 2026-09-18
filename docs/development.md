# Development

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:moderate
npm run check:outdated
```

`npm run audit:moderate` fails on moderate-or-higher known vulnerabilities. `npm run check:outdated` fails when npm reports outdated installed dependencies, which keeps dependency drift visible in CI.

## Before a pull request or release

Before opening a pull request or publishing a release, run:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:moderate
npm run check:outdated
git diff --check
```

Project Markdown is limited to `README.md` and the files under `docs/`. Until 19 Sep 2026 only `README.md` was tracked. Keep private notes, local handoff files, environment files, and generated workflow logs outside version control.
