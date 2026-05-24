import type { ApiParameter, ApiResponse, OpenApiDocument, OpenApiOperation } from "./types.js";

export function renderMarkdown(document: OpenApiDocument): string {
  const lines: string[] = [
    `# ${document.info.title}`,
    "",
    `Version: ${document.info.version}`,
    ""
  ];

  if (document.info.description) {
    lines.push(document.info.description, "");
  }

  for (const [path, method, operation] of operations(document)) {
    lines.push(`## \`${method.toUpperCase()} ${path}\``, "");
    if (operation.summary) {
      lines.push(operation.summary, "");
    }
    if (operation.description) {
      lines.push(operation.description, "");
    }
    if (operation.tags?.length) {
      lines.push(`Tags: ${operation.tags.join(", ")}`, "");
    }
    if (operation.parameters?.length) {
      lines.push("### Parameters", "", "| Name | In | Required | Schema | Description |", "| --- | --- | --- | --- | --- |");
      for (const parameter of operation.parameters) {
        lines.push(parameterRow(parameter));
      }
      lines.push("");
    }
    lines.push("### Responses", "", "| Status | Description |", "| --- | --- |");
    for (const [status, response] of Object.entries(operation.responses)) {
      lines.push(`| ${status} | ${escapeMarkdown(response.description)} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderHtml(document: OpenApiDocument): string {
  const sections = operations(document)
    .map(([path, method, operation]) => renderOperationHtml(path, method, operation))
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.info.title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #172033; }
    main { max-width: 960px; margin: 0 auto; padding: 40px 20px 64px; }
    h1 { margin: 0 0 8px; font-size: 2rem; }
    .version { color: #536176; margin: 0 0 32px; }
    section { border-top: 1px solid #d6dce5; padding: 24px 0; }
    code { background: #e8edf5; border-radius: 4px; padding: 2px 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #d6dce5; padding: 8px; text-align: left; vertical-align: top; }
    th { font-size: 0.82rem; color: #536176; text-transform: uppercase; }
    @media (prefers-color-scheme: dark) {
      body { background: #101722; color: #e8edf5; }
      code { background: #1d2938; }
      section, th, td { border-color: #2b3747; }
      .version, th { color: #a9b4c2; }
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(document.info.title)}</h1>
    <p class="version">Version ${escapeHtml(document.info.version)}</p>
    ${document.info.description ? `<p>${escapeHtml(document.info.description)}</p>` : ""}
${sections}
  </main>
</body>
</html>
`;
}

function renderOperationHtml(path: string, method: string, operation: OpenApiOperation): string {
  const parameters = operation.parameters?.length
    ? `<h3>Parameters</h3>
    <table>
      <thead><tr><th>Name</th><th>In</th><th>Required</th><th>Schema</th><th>Description</th></tr></thead>
      <tbody>
${operation.parameters.map((parameter) => `        <tr><td>${escapeHtml(parameter.name)}</td><td>${parameter.in}</td><td>${parameter.required ? "yes" : "no"}</td><td>${escapeHtml(schemaLabel(parameter.schema))}</td><td>${escapeHtml(parameter.description ?? "")}</td></tr>`).join("\n")}
      </tbody>
    </table>`
    : "";
  return `    <section>
      <h2><code>${method.toUpperCase()} ${escapeHtml(path)}</code></h2>
      ${operation.summary ? `<p><strong>${escapeHtml(operation.summary)}</strong></p>` : ""}
      ${operation.description ? `<p>${escapeHtml(operation.description)}</p>` : ""}
      ${operation.tags?.length ? `<p>Tags: ${operation.tags.map(escapeHtml).join(", ")}</p>` : ""}
      ${parameters}
      <h3>Responses</h3>
      <table>
        <thead><tr><th>Status</th><th>Description</th></tr></thead>
        <tbody>
${Object.entries(operation.responses).map(([status, response]) => responseRow(status, response)).join("\n")}
        </tbody>
      </table>
    </section>`;
}

function responseRow(status: string, response: ApiResponse): string {
  return `          <tr><td>${escapeHtml(status)}</td><td>${escapeHtml(response.description)}</td></tr>`;
}

function operations(document: OpenApiDocument): Array<[string, string, OpenApiOperation]> {
  return Object.entries(document.paths)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([path, item]) =>
      Object.entries(item)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([method, operation]) => [path, method, operation] as [string, string, OpenApiOperation])
    );
}

function parameterRow(parameter: ApiParameter): string {
  return `| ${escapeMarkdown(parameter.name)} | ${parameter.in} | ${parameter.required ? "yes" : "no"} | ${escapeMarkdown(schemaLabel(parameter.schema))} | ${escapeMarkdown(parameter.description ?? "")} |`;
}

function schemaLabel(schema: Record<string, unknown>): string {
  const type = typeof schema.type === "string" ? schema.type : "object";
  const format = typeof schema.format === "string" ? `:${schema.format}` : "";
  return `${type}${format}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
