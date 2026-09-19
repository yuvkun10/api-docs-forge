# AGENTS.md

`api-docs-forge` is a TypeScript CLI and library that scans route files and builds an OpenAPI 3.1 document, Markdown and standalone HTML from them.

## Setup

Node.js 20.11 or newer and npm.

```bash
npm install
npm run build
```

No environment variables are required. `OPENAI_API_KEY` and `OPENAI_MODEL` apply only with `--openai`. See [docs/configuration.md](docs/configuration.md).

## Commands

```bash
npm run build           # tsc -p tsconfig.build.json
npm test                # vitest run
npm run lint            # eslint .
npm run typecheck       # tsc --noEmit
npm run audit:moderate  # npm audit --audit-level=moderate
npm run check:outdated  # npm outdated
```

Run the CLI after a build with `node dist/cli.js generate "src/**/*.ts" --out docs`.

## Project structure

- `src/cli.ts`: command line entry.
- `src/parser.ts`, `src/annotations.ts`, `src/schema.ts`: route extraction.
- `src/openapi.ts`, `src/renderers.ts`, `src/generator.ts`: OpenAPI build and output.
- `src/descriptions.ts`: optional OpenAI description provider.
- `test/`: Vitest suites.

Details are in [docs/architecture.md](docs/architecture.md).

## Conventions

- TypeScript `strict`. ESLint uses the `@eslint/js` and `typescript-eslint` recommended configs. Prefix intentionally unused variables with `_`.
- No formatter or commit convention is enforced. Recent history uses `type: summary` subjects. Do not add attribution trailers.
- Tracked Markdown is limited to `README.md`, `AGENTS.md`, `CLAUDE.md` and `docs/`. Keep private notes, handoff files and workflow logs out of Git.

## Testing

Before a PR, run the checks in [docs/development.md](docs/development.md): lint, typecheck, test, build, `audit:moderate`, `check:outdated` and `git diff --check`. CI runs the same set.

## Safety

- Never commit `.env` files or API keys. Only `.env.example` with empty values is tracked.
- The OpenAI path is optional. Keep the default generation offline and deterministic.

## More

- [docs/README.md](docs/README.md): docs index
- [docs/usage.md](docs/usage.md): CLI options, library usage, route annotations
- [docs/development.md](docs/development.md): development checks
