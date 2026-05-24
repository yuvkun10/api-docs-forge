#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";

import { generateApiDocs } from "./generator.js";
import type { DocFormat } from "./types.js";

const program = new Command();

program
  .name("api-docs-forge")
  .description("Generate OpenAPI, Markdown, and HTML API documentation from TypeScript route code.")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate docs from TypeScript route files or globs.")
  .argument("[input...]", "Input files or globs. Defaults to src/**/*.ts.")
  .option("-o, --out <dir>", "Output directory", "docs")
  .option("--title <title>", "OpenAPI title", "API")
  .option("--api-version <version>", "OpenAPI info.version", "1.0.0")
  .option("--description <description>", "OpenAPI info.description")
  .option("--format <formats>", "Comma-separated formats: openapi,markdown,html", parseFormats, [
    "openapi",
    "markdown",
    "html"
  ] satisfies DocFormat[])
  .option("--openai", "Use OPENAI_API_KEY to fill missing descriptions, with deterministic fallback", false)
  .option("--openai-model <model>", "OpenAI model for generated descriptions")
  .action(async (input: string[], options) => {
    try {
      const result = await generateApiDocs({
        input: input.length > 0 ? input : ["src/**/*.ts"],
        outDir: options.out,
        title: options.title,
        version: options.apiVersion,
        description: options.description,
        formats: options.format,
        useOpenAI: options.openai,
        openAIModel: options.openaiModel
      });

      for (const file of result.writtenFiles) {
        process.stdout.write(`wrote ${file}\n`);
      }
      process.stdout.write(`documented ${result.routes.length} route(s)\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);

function parseFormats(value: string): DocFormat[] {
  const formats = value.split(",").map((format) => format.trim()).filter(Boolean);
  const valid = new Set<DocFormat>(["openapi", "markdown", "html"]);
  const invalid = formats.find((format) => !valid.has(format as DocFormat));
  if (invalid) {
    throw new InvalidArgumentError(`Unsupported format: ${invalid}`);
  }
  return formats as DocFormat[];
}
