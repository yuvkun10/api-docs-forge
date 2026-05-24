import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseProjectRoutes } from "../src/index.js";

async function writeFixture(source: string) {
  const dir = await mkdtemp(join(tmpdir(), "api-docs-forge-"));
  const file = join(dir, "routes.ts");
  await writeFile(file, source, "utf8");
  return file;
}

describe("parseProjectRoutes", () => {
  it("extracts annotated Express-style route calls", async () => {
    const file = await writeFixture(`
      import { Router } from "express";
      const router = Router();

      /**
       * @summary List users
       * @description Returns users visible to the current API token.
       * @tag Users
       * @query search string optional Search text
       * @response 200 List of users {"type":"array","items":{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}}
       */
      router.get("/users", listUsers);
    `);

    const routes = await parseProjectRoutes([file]);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      method: "get",
      path: "/users",
      summary: "List users",
      description: "Returns users visible to the current API token.",
      tags: ["Users"]
    });
    expect(routes[0]?.parameters).toEqual([
      {
        name: "search",
        in: "query",
        required: false,
        description: "Search text",
        schema: { type: "string" }
      }
    ]);
    expect(routes[0]?.responses["200"]?.content?.["application/json"]?.schema).toMatchObject({
      type: "array"
    });
  });

  it("extracts standalone annotated handlers", async () => {
    const file = await writeFixture(`
      /**
       * @api POST /invoices
       * @summary Create invoice
       * @tag Invoices
       * @requestBody application/json {"type":"object","required":["amount"],"properties":{"amount":{"type":"number"}}}
       * @response 201 Created {"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}
       */
      export async function createInvoice() {}
    `);

    const routes = await parseProjectRoutes([file]);

    expect(routes).toHaveLength(1);
    expect(routes[0]?.method).toBe("post");
    expect(routes[0]?.path).toBe("/invoices");
    expect(routes[0]?.operationId).toBe("createInvoice");
    expect(routes[0]?.requestBody?.content["application/json"].schema).toMatchObject({
      required: ["amount"]
    });
    expect(routes[0]?.responses["201"]?.description).toBe("Created");
  });

  it("extracts Fastify schema metadata and normalizes path parameters", async () => {
    const file = await writeFixture(`
      fastify.get("/reports/:id", {
        schema: {
          summary: "Fetch report",
          tags: ["Reports"],
          params: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string", description: "Report id" } }
          },
          querystring: {
            type: "object",
            properties: { includeDetails: { type: "boolean" } }
          },
          response: {
            200: {
              type: "object",
              required: ["id"],
              properties: { id: { type: "string" }, status: { type: "string" } }
            }
          }
        }
      }, async () => {});
    `);

    const routes = await parseProjectRoutes([file]);

    expect(routes[0]?.path).toBe("/reports/{id}");
    expect(routes[0]?.parameters).toEqual([
      {
        name: "id",
        in: "path",
        required: true,
        description: "Report id",
        schema: { type: "string", description: "Report id" }
      },
      {
        name: "includeDetails",
        in: "query",
        required: false,
        schema: { type: "boolean" }
      }
    ]);
    expect(routes[0]?.responses["200"]?.content?.["application/json"]?.schema).toMatchObject({
      required: ["id"]
    });
  });
});
