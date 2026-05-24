import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { OpenAIDescriptionProvider } from "./descriptions.js";
import { buildOpenApiDocument } from "./openapi.js";
import { parseProjectRoutes } from "./parser.js";
import { renderHtml, renderMarkdown } from "./renderers.js";
import type { ApiRoute, DocFormat, GenerateDocsOptions, GenerateDocsResult } from "./types.js";
import { stableJson } from "./utils.js";

const DEFAULT_FORMATS: DocFormat[] = ["openapi", "markdown", "html"];

export async function generateApiDocs(options: GenerateDocsOptions): Promise<GenerateDocsResult> {
  const formats = options.formats?.length ? options.formats : DEFAULT_FORMATS;
  const routes = options.useOpenAI
    ? await enrichDescriptions(await parseProjectRoutes(options.input), options.openAIModel)
    : await parseProjectRoutes(options.input);
  const document = buildOpenApiDocument(routes, {
    title: options.title,
    version: options.version,
    description: options.description
  });

  await mkdir(options.outDir, { recursive: true });
  const writtenFiles: string[] = [];

  if (formats.includes("openapi")) {
    const file = join(options.outDir, "openapi.json");
    await writeFile(file, `${stableJson(document)}\n`, "utf8");
    writtenFiles.push(file);
  }
  if (formats.includes("markdown")) {
    const file = join(options.outDir, "api.md");
    await writeFile(file, renderMarkdown(document), "utf8");
    writtenFiles.push(file);
  }
  if (formats.includes("html")) {
    const file = join(options.outDir, "index.html");
    await writeFile(file, renderHtml(document), "utf8");
    writtenFiles.push(file);
  }

  return {
    routes,
    document,
    writtenFiles
  };
}

async function enrichDescriptions(routes: ApiRoute[], model?: string): Promise<ApiRoute[]> {
  const provider = new OpenAIDescriptionProvider({ model });
  return Promise.all(
    routes.map(async (route) => ({
      ...route,
      description: route.description ?? (await provider.describeRoute(route))
    }))
  );
}
