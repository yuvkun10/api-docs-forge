# api-docs-forge

`api-docs-forge` generates API documentation from TypeScript route code. It scans route files, extracts route metadata from Express-style calls, Fastify-style schemas and JSDoc-style annotations, builds an OpenAPI 3.1 document, and renders Markdown and standalone HTML from it. It is for backend and platform engineers who want API docs generated from the backend code, locally or in CI. Status: version 0.1.0, a CLI and a library, with CI on every push and pull request.

## Installation

Prerequisites:

- Node.js 20.11 or newer.
- npm.

Install dependencies and build from a checkout:

```bash
npm install
npm run build
```

No environment variables are required. Two optional ones, `OPENAI_API_KEY` and `OPENAI_MODEL`, apply only when you pass `--openai`. See [docs/configuration.md](docs/configuration.md).

## Usage

Generate docs from route files after building:

```bash
node dist/cli.js generate "src/**/*.ts" --out docs --title "Billing API" --api-version "1.0.0"
```

This writes `openapi.json`, `api.md` and `index.html` to the output directory. When installed as a package, the binary name is `api-docs-forge`:

```bash
npx api-docs-forge generate "src/routes/**/*.ts" --out docs
```

Daily commands:

```bash
npm run build      # tsc -p tsconfig.build.json
npm test           # vitest run
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
```

All CLI options, library usage and the supported route annotations are in [docs/usage.md](docs/usage.md). The package is not deployed anywhere. It runs locally or as a CI step.

## Project structure

```text
├── .github
│   ├── workflows
│   │   └── ci.yml
│   └── dependabot.yml
├── docs
│   ├── architecture.md
│   ├── architecture.mmd
│   └── archive
├── src
│   ├── cli.ts
│   ├── index.ts
│   ├── parser.ts
│   ├── annotations.ts
│   ├── schema.ts
│   ├── openapi.ts
│   ├── renderers.ts
│   ├── descriptions.ts
│   └── generator.ts
├── test
├── .env.example
├── eslint.config.js
├── package.json
└── tsconfig.json
```

Components and data flow are described in [docs/architecture.md](docs/architecture.md).

## Coding style

ESLint runs with the `@eslint/js` and `typescript-eslint` recommended configs (`eslint.config.js`). Unused variables are errors unless prefixed with `_`, and `no-explicit-any` is turned off. TypeScript runs with `strict: true`. No formatter, commit convention or git hooks are configured. Run the checks with:

```bash
npm run lint
npm run typecheck
```

CI also runs `npm run audit:moderate` and `npm run check:outdated`. See [docs/development.md](docs/development.md).

## Test

```bash
npm test
```

Vitest runs the suites in `test/`. They cover the route parser, the OpenAPI builder, the Markdown and HTML renderers, and the description provider.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Usage reference](docs/usage.md)
- [Configuration, privacy and security](docs/configuration.md)
- [Development](docs/development.md)

## License

MIT. See [LICENSE](LICENSE).
