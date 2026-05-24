import { describe, expect, it } from "vitest";

import { DeterministicDescriptionProvider, OpenAIDescriptionProvider } from "../src/index.js";
import type { ApiRoute, TextGenerationClient } from "../src/index.js";

const route: ApiRoute = {
  method: "delete",
  path: "/sessions/{id}",
  operationId: "deleteSession",
  summary: "Delete session",
  tags: ["Sessions"],
  parameters: [],
  responses: {
    "204": {
      description: "No Content"
    }
  }
};

describe("description providers", () => {
  it("creates deterministic fallback descriptions", async () => {
    const provider = new DeterministicDescriptionProvider();

    await expect(provider.describeRoute(route)).resolves.toBe(
      "DELETE /sessions/{id} handles Delete session for Sessions."
    );
  });

  it("uses an injected OpenAI-compatible client when a key is available", async () => {
    const fakeClient: TextGenerationClient = {
      async generateText(_input) {
        return "Removes an authenticated session by id.";
      }
    };
    const provider = new OpenAIDescriptionProvider({
      apiKey: "test-key",
      client: fakeClient,
      fallback: new DeterministicDescriptionProvider()
    });

    await expect(provider.describeRoute(route)).resolves.toBe("Removes an authenticated session by id.");
  });

  it("falls back deterministically when no key is available", async () => {
    const provider = new OpenAIDescriptionProvider({
      apiKey: "",
      fallback: new DeterministicDescriptionProvider()
    });

    await expect(provider.describeRoute(route)).resolves.toBe(
      "DELETE /sessions/{id} handles Delete session for Sessions."
    );
  });
});
