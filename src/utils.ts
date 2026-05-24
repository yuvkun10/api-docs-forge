import { HTTP_METHODS, type ApiParameter, type HttpMethod, type JsonSchema } from "./types.js";

const METHOD_SET = new Set<string>(HTTP_METHODS);

export function isHttpMethod(value: string): value is HttpMethod {
  return METHOD_SET.has(value.toLowerCase());
}

export function normalizeMethod(value: string): HttpMethod {
  const method = value.toLowerCase();
  if (!isHttpMethod(method)) {
    throw new Error(`Unsupported HTTP method: ${value}`);
  }
  return method;
}

export function normalizePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

export function pathParameters(path: string): ApiParameter[] {
  const seen = new Set<string>();
  const params: ApiParameter[] = [];
  for (const match of path.matchAll(/\{([^}/]+)\}/g)) {
    const name = match[1];
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    params.push({
      name,
      in: "path",
      required: true,
      schema: { type: "string" }
    });
  }
  return params;
}

export function makeOperationId(method: HttpMethod, path: string): string {
  const tokens = path
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[{}]/g, ""))
    .map((part) => part.replace(/[^A-Za-z0-9]+/g, " "))
    .flatMap((part) => part.split(" "))
    .filter(Boolean);

  const suffix = tokens.map(capitalize).join("");
  return `${method}${suffix || "Root"}`;
}

export function mergeParameters(...groups: ApiParameter[][]): ApiParameter[] {
  const merged = new Map<string, ApiParameter>();
  for (const group of groups) {
    for (const parameter of group) {
      const key = `${parameter.in}:${parameter.name}`;
      const current = merged.get(key);
      merged.set(key, current ? mergeParameter(current, parameter) : parameter);
    }
  }
  return [...merged.values()];
}

export function schemaForType(type: string): JsonSchema {
  const normalized = type.toLowerCase();
  if (["string", "number", "integer", "boolean", "object", "array"].includes(normalized)) {
    return { type: normalized };
  }
  return { type: "string", format: type };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries = value.filter((entry): entry is string => typeof entry === "string");
  return entries.length > 0 ? entries : undefined;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortObject(value), null, 2);
}

function mergeParameter(left: ApiParameter, right: ApiParameter): ApiParameter {
  return {
    ...left,
    ...right,
    required: left.required || right.required,
    schema: { ...left.schema, ...right.schema },
    description: right.description ?? left.description
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortObject(entry)])
  );
}
