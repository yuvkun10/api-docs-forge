import { describe, expect, it } from "vitest";

import { renderHtml, renderMarkdown } from "../src/index.js";
import type { OpenApiDocument } from "../src/index.js";

const document: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Docs Forge API", version: "1.0.0" },
  paths: {
    "/users/{id}": {
      get: {
        operationId: "getUser",
        summary: "Fetch <user>",
        description: "Returns a single user.",
        tags: ["Users"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "OK"
          }
        }
      }
    }
  }
};

describe("renderers", () => {
  it("renders Markdown with operation summaries and response tables", () => {
    const markdown = renderMarkdown(document);

    expect(markdown).toContain("# Docs Forge API");
    expect(markdown).toContain("## `GET /users/{id}`");
    expect(markdown).toContain("| 200 | OK |");
  });

  it("renders escaped standalone HTML", () => {
    const html = renderHtml(document);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Fetch &lt;user&gt;");
    expect(html).toContain("<code>GET /users/{id}</code>");
  });
});
