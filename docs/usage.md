# Usage reference

## Running the CLI

Run the local CLI after building:

```bash
node dist/cli.js generate "src/**/*.ts" --out docs --title "Billing API" --api-version "1.0.0"
```

When installed as a package, the binary name is `api-docs-forge`:

```bash
npx api-docs-forge generate "src/**/*.ts" --out docs --title "Billing API" --api-version "1.0.0"
```

Generated files:

- `docs/openapi.json`
- `docs/api.md`
- `docs/index.html`

## CLI reference

```bash
api-docs-forge generate [input...] [options]
```

Options:

- `-o, --out <dir>`: output directory. Defaults to `docs`.
- `--title <title>`: OpenAPI `info.title`. Defaults to `API`.
- `--api-version <version>`: OpenAPI `info.version`. Defaults to `1.0.0`.
- `--description <description>`: OpenAPI `info.description`.
- `--format <formats>`: comma-separated output formats: `openapi`, `markdown`, `html`.
- `--openai`: fill missing descriptions through the optional description provider.
- `--openai-model <model>`: model name for optional generated descriptions.

Examples:

```bash
api-docs-forge generate "src/routes/**/*.ts" --out docs
api-docs-forge generate src/routes/users.ts src/routes/billing.ts --format openapi,markdown
api-docs-forge generate "services/**/*.ts" --title "Platform API" --api-version "2026.05"
```

## Library usage

```ts
import { buildOpenApiDocument, parseProjectRoutes, renderMarkdown } from "api-docs-forge";

const routes = await parseProjectRoutes(["src/**/*.ts"]);
const document = buildOpenApiDocument(routes, {
  title: "Billing API",
  version: "1.0.0"
});

const markdown = renderMarkdown(document);
```

For end-to-end generation from code to files:

```ts
import { generateApiDocs } from "api-docs-forge";

await generateApiDocs({
  input: ["src/**/*.ts"],
  outDir: "docs",
  title: "Billing API",
  version: "1.0.0",
  formats: ["openapi", "markdown", "html"]
});
```

## Route metadata

Annotated handler:

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

Annotated route call:

```ts
/**
 * @summary List users
 * @tag Users
 * @query search string optional Search text
 * @response 200 List of users {"type":"array","items":{"type":"object"}}
 */
router.get("/users", listUsers);
```

Fastify-style static schema:

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

Supported annotation tags include `@api`, `@route`, `@summary`, `@description`, `@tag`, `@tags`, `@operationId`, `@param`, `@query`, `@path`, `@header`, `@requestBody`, `@body`, and `@response`.
