import type { ApiRoute, DescriptionProvider, TextGenerationClient, TextGenerationRequest } from "./types.js";

export interface OpenAIDescriptionProviderOptions {
  apiKey?: string;
  model?: string;
  client?: TextGenerationClient;
  fallback?: DescriptionProvider;
}

export class DeterministicDescriptionProvider implements DescriptionProvider {
  async describeRoute(route: ApiRoute): Promise<string> {
    const tagPhrase = route.tags?.length ? ` for ${route.tags.join(", ")}` : "";
    const summary = route.summary ? ` handles ${route.summary}` : " handles this API operation";
    return `${route.method.toUpperCase()} ${route.path}${summary}${tagPhrase}.`;
  }
}

export class OpenAIDescriptionProvider implements DescriptionProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly client?: TextGenerationClient;
  private readonly fallback: DescriptionProvider;

  constructor(options: OpenAIDescriptionProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.2";
    this.client = options.client;
    this.fallback = options.fallback ?? new DeterministicDescriptionProvider();
  }

  async describeRoute(route: ApiRoute): Promise<string> {
    if (!this.apiKey) {
      return this.fallback.describeRoute(route);
    }

    try {
      const text = await this.textClient().generateText({
        model: this.model,
        instructions:
          "Write one concise, factual OpenAPI operation description. Do not include Markdown, quotes, or invented behavior.",
        input: JSON.stringify({
          method: route.method.toUpperCase(),
          path: route.path,
          operationId: route.operationId,
          summary: route.summary,
          tags: route.tags,
          parameters: route.parameters.map((parameter) => ({
            name: parameter.name,
            in: parameter.in,
            required: parameter.required
          })),
          responses: Object.keys(route.responses)
        })
      });
      return normalizeDescription(text) || this.fallback.describeRoute(route);
    } catch {
      return this.fallback.describeRoute(route);
    }
  }

  private textClient(): TextGenerationClient {
    return this.client ?? new OpenAISdkTextGenerationClient(this.apiKey);
  }
}

class OpenAISdkTextGenerationClient implements TextGenerationClient {
  constructor(private readonly apiKey: string) {}

  async generateText(request: TextGenerationRequest): Promise<string> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: this.apiKey });
    const response = await client.responses.create({
      model: request.model,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: 120
    });
    return response.output_text ?? "";
  }
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 500);
}
