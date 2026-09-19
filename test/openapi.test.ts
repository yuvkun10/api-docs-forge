import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../src/index.js";
import type { ApiRoute } from "../src/index.js";

describe("buildOpenApiDocument", () => {
  it("builds OpenAPI 3.1 paths, operations, schemas, and metadata", () => {
    const routes: ApiRoute[] = [
      {
        method: "post",
        path: "/invoices",
        operationId: "createInvoice",
        summary: "Create invoice",
        tags: ["Invoices"],
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: { amount: { type: "number" } }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["id"],
                  properties: { id: { type: "string" } }
                }
              }
            }
          }
        }
      }
    ];

    const document = buildOpenApiDocument(routes, {
      title: "Billing API",
      version: "2026.05"
    });

    expect(document).toMatchObject({
      openapi: "3.1.0",
      info: { title: "Billing API", version: "2026.05" }
    });
    expect(document.paths["/invoices"]?.post).toMatchObject({
      operationId: "createInvoice",
      summary: "Create invoice",
      requestBody: {
        required: true
      },
      responses: {
        "201": {
          description: "Created"
        }
      }
    });
  });

  it("adds deterministic fallback responses for routes without responses", () => {
    const document = buildOpenApiDocument(
      [
        {
          method: "get",
          path: "/health",
          operationId: "getHealth",
          parameters: [],
          responses: {}
        }
      ],
      { title: "Health API", version: "1.0.0" }
    );

    expect(document.paths["/health"]?.get?.responses).toEqual({
      "200": {
        description: "Successful response"
      }
    });
  });

  it("keeps unsafe route paths as plain keys without polluting Object.prototype", () => {
    const routes: ApiRoute[] = ["__proto__", "constructor", "prototype"].map((path) => ({
      method: "get",
      path,
      operationId: `get_${path}`,
      parameters: [],
      responses: {}
    }));

    const document = buildOpenApiDocument(routes, { title: "Unsafe API", version: "1.0.0" });

    expect(({} as Record<string, unknown>).get).toBeUndefined();
    expect(Object.entries(document.paths).map(([path, item]) => [path, item.get?.operationId])).toEqual([
      ["__proto__", "get___proto__"],
      ["constructor", "get_constructor"],
      ["prototype", "get_prototype"]
    ]);
  });
});
