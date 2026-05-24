import type { ApiResponse, ApiRoute, OpenApiDocument, OpenApiOptions } from "./types.js";

export function buildOpenApiDocument(routes: ApiRoute[], options: OpenApiOptions): OpenApiDocument {
  const document: OpenApiDocument = {
    openapi: "3.1.0",
    info: {
      title: options.title,
      version: options.version,
      ...(options.description ? { description: options.description } : {})
    },
    paths: {}
  };

  for (const route of [...routes].sort(compareRoutes)) {
    document.paths[route.path] ??= {};
    document.paths[route.path][route.method] = {
      operationId: route.operationId,
      ...(route.summary ? { summary: route.summary } : {}),
      ...(route.description ? { description: route.description } : {}),
      ...(route.tags && route.tags.length > 0 ? { tags: route.tags } : {}),
      ...(route.parameters.length > 0 ? { parameters: route.parameters } : {}),
      ...(route.requestBody ? { requestBody: route.requestBody } : {}),
      responses: responsesOrFallback(route.responses)
    };
  }

  return document;
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
