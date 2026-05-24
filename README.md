# api-docs-forge

TypeScript CLI and library for generating API documentation from route code. It parses common route definitions and annotated handlers, emits OpenAPI 3.1, and renders Markdown plus standalone HTML.

## Features

- Parse Express-style route calls such as `router.get("/users/:id", handler)`.
- Parse Fastify-style route schemas including `params`, `querystring`, `body`, and `response`.
- Parse annotated handlers with `@api`, `@summary`, `@tag`, `@requestBody`, and `@response`.
- Generate OpenAPI 3.1 JSON, Markdown, and HTML output.
- Optionally fill missing route descriptions with OpenAI when `OPENAI_API_KEY` is set.
- Fall back to deterministic local descriptions when OpenAI is not configured or a request fails.

## Install

```bash
npm install
npm run build
```

## CLI

```bash
npx api-docs-forge generate "src/**/*.ts" --out docs --title "Billing API" --api-version "1.0.0"
```

Generated files:

- `docs/openapi.json`
- `docs/api.md`
- `docs/index.html`

Use OpenAI descriptions only when you want generated prose for missing descriptions:

```bash
npx api-docs-forge generate "src/**/*.ts" --out docs --openai
```

The `--openai` option reads `OPENAI_API_KEY` from the local environment. If no key is available, output remains deterministic.

## Library

```ts
import { buildOpenApiDocument, parseProjectRoutes, renderMarkdown } from "api-docs-forge";

const routes = await parseProjectRoutes(["src/**/*.ts"]);
const document = buildOpenApiDocument(routes, {
  title: "Billing API",
  version: "1.0.0"
});

const markdown = renderMarkdown(document);
```

## Route Comments

```ts
/**
 * @api POST /invoices
 * @summary Create invoice
 * @tag Invoices
 * @requestBody application/json {"type":"object","required":["amount"],"properties":{"amount":{"type":"number"}}}
 * @response 201 Created {"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}
 */
export async function createInvoice() {}
```

## Route Calls

```ts
/**
 * @summary List users
 * @tag Users
 * @query search string optional Search text
 * @response 200 List of users {"type":"array","items":{"type":"object"}}
 */
router.get("/users", listUsers);
```

Fastify schemas are read when they are statically declared as object literals:

```ts
fastify.get("/reports/:id", {
  schema: {
    summary: "Fetch report",
    tags: ["Reports"],
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } }
    },
    response: {
      200: {
        type: "object",
        properties: { id: { type: "string" } }
      }
    }
  }
}, async () => {});
```

## Development

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local` only for local development. Do not commit real environment files.
