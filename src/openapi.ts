import type { ApiResponse, ApiRoute, OpenApiDocument, OpenApiOptions, OpenApiPathItem } from "./types.js";

export function buildOpenApiDocument(routes: ApiRoute[], options: OpenApiOptions): OpenApiDocument {
  // A Map keeps route paths such as "__proto__" from reaching Object.prototype.
  const paths = new Map<string, OpenApiPathItem>();

  for (const route of [...routes].sort(compareRoutes)) {
    const item = paths.get(route.path) ?? {};
    paths.set(route.path, item);
    item[route.method] = {
      operationId: route.operationId,
      ...(route.summary ? { summary: route.summary } : {}),
      ...(route.description ? { description: route.description } : {}),
      ...(route.tags && route.tags.length > 0 ? { tags: route.tags } : {}),
      ...(route.parameters.length > 0 ? { parameters: route.parameters } : {}),
      ...(route.requestBody ? { requestBody: route.requestBody } : {}),
      responses: responsesOrFallback(route.responses)
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: options.title,
      version: options.version,
      ...(options.description ? { description: options.description } : {})
    },
    paths: Object.fromEntries(paths)
  };
}

function responsesOrFallback(responses: Record<string, ApiResponse>): Record<string, ApiResponse> {
  if (Object.keys(responses).length > 0) {
    return responses;
  }
  return {
    "200": {
      description: "Successful response"
    }
  };
}

function compareRoutes(left: ApiRoute, right: ApiRoute): number {
  return `${left.path}:${left.method}`.localeCompare(`${right.path}:${right.method}`);
}
