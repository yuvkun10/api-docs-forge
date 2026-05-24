import type { ApiParameter, ApiRequestBody, ApiResponse, HttpMethod } from "./types.js";
import { normalizeMethod, normalizePath, schemaForType } from "./utils.js";

export interface ParsedAnnotations {
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
}

export function parseAnnotations(comment: string | undefined): ParsedAnnotations {
  const parsed: ParsedAnnotations = {
    tags: [],
    parameters: [],
    responses: {}
  };
  if (!comment) {
    return parsed;
  }

  for (const line of cleanCommentLines(comment)) {
    if (!line.startsWith("@")) {
      continue;
    }

    const [tag, ...restParts] = line.slice(1).split(/\s+/);
    const rest = restParts.join(" ").trim();

    switch (tag) {
      case "api":
      case "route":
        parseRoute(rest, parsed);
        break;
      case "summary":
        parsed.summary = rest;
        break;
      case "description":
        parsed.description = parsed.description ? `${parsed.description}\n${rest}` : rest;
        break;
      case "tag":
        if (rest) {
          parsed.tags.push(rest);
        }
        break;
      case "tags":
        parsed.tags.push(...rest.split(",").map((entry) => entry.trim()).filter(Boolean));
        break;
      case "operationId":
        parsed.operationId = rest;
        break;
      case "param":
        parsed.parameters.push(parseParameter(rest));
        break;
      case "query":
        parsed.parameters.push(parseParameter(rest, "query"));
        break;
      case "path":
        parsed.parameters.push(parseParameter(rest, "path"));
        break;
      case "header":
        parsed.parameters.push(parseParameter(rest, "header"));
        break;
      case "requestBody":
      case "body":
        parsed.requestBody = parseRequestBody(rest);
        break;
      case "response":
        parseResponse(rest, parsed.responses);
        break;
      default:
        break;
    }
  }

  return parsed;
}

function cleanCommentLines(comment: string): string[] {
  return comment
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);
}

function parseRoute(rest: string, parsed: ParsedAnnotations): void {
  const [method, path] = rest.split(/\s+/);
  if (!method || !path) {
    return;
  }
  parsed.method = normalizeMethod(method);
  parsed.path = normalizePath(path);
}

function parseParameter(rest: string, fixedLocation?: ApiParameter["in"]): ApiParameter {
  const parts = rest.split(/\s+/);
  if (fixedLocation) {
    const [name = "value", type = "string", required = fixedLocation === "path" ? "required" : "optional", ...description] = parts;
    return {
      name,
      in: fixedLocation,
      required: fixedLocation === "path" || required.toLowerCase() === "required",
      description: description.join(" ") || undefined,
      schema: schemaForType(type)
    };
  }

  const [name = "value", location = "query", type = "string", required = "optional", ...description] = parts;
  return {
    name,
    in: normalizeParameterLocation(location),
    required: location === "path" || required.toLowerCase() === "required",
    description: description.join(" ") || undefined,
    schema: schemaForType(type)
  };
}

function parseRequestBody(rest: string): ApiRequestBody {
  const [contentType = "application/json", ...schemaParts] = rest.split(/\s+/);
  return {
    required: true,
    content: {
      [contentType]: {
        schema: parseInlineJsonSchema(schemaParts.join(" "))
      }
    }
  };
}

function parseResponse(rest: string, responses: Record<string, ApiResponse>): void {
  const [status = "200", ...descriptionParts] = rest.split(/\s+/);
  const descriptionAndSchema = descriptionParts.join(" ").trim();
  const schemaStart = findJsonStart(descriptionAndSchema);
  const description = schemaStart === -1 ? descriptionAndSchema : descriptionAndSchema.slice(0, schemaStart).trim();
  const schemaText = schemaStart === -1 ? "" : descriptionAndSchema.slice(schemaStart).trim();

  responses[status] = {
    description: description || defaultResponseDescription(status),
    ...(schemaText
      ? {
          content: {
            "application/json": {
              schema: parseInlineJsonSchema(schemaText)
            }
          }
        }
      : {})
  };
}

function parseInlineJsonSchema(value: string) {
  if (!value) {
    return { type: "object" };
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { type: "object", description: value };
  }
}

function findJsonStart(value: string): number {
  const objectStart = value.indexOf("{");
  const arrayStart = value.indexOf("[");
  if (objectStart === -1) {
    return arrayStart;
  }
  if (arrayStart === -1) {
    return objectStart;
  }
  return Math.min(objectStart, arrayStart);
}

function normalizeParameterLocation(value: string): ApiParameter["in"] {
  if (value === "path" || value === "query" || value === "header" || value === "cookie") {
    return value;
  }
  return "query";
}

function defaultResponseDescription(status: string): string {
  if (status === "204") {
    return "No Content";
  }
  return status.startsWith("2") ? "Successful response" : "Response";
}
