import ts from "typescript";

import type { ApiParameter, ApiRequestBody, ApiResponse, JsonSchema } from "./types.js";
import { isRecord, stringArray } from "./utils.js";

export interface RouteSchemaMetadata {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
}

export function extractRouteSchema(options: ts.ObjectLiteralExpression | undefined): RouteSchemaMetadata {
  const empty: RouteSchemaMetadata = {
    parameters: [],
    responses: {}
  };
  if (!options) {
    return empty;
  }

  const schemaExpression = getProperty(options, "schema");
  if (!schemaExpression || !ts.isObjectLiteralExpression(schemaExpression)) {
    return empty;
  }

  const raw = literalToValue(schemaExpression);
  if (!isRecord(raw)) {
    return empty;
  }

  return {
    summary: stringValue(raw.summary),
    description: stringValue(raw.description),
    tags: stringArray(raw.tags),
    operationId: stringValue(raw.operationId),
    parameters: [
      ...parametersFromSchema(raw.params, "path"),
      ...parametersFromSchema(raw.querystring ?? raw.query, "query"),
      ...parametersFromSchema(raw.headers, "header")
    ],
    requestBody: requestBodyFromSchema(raw.body),
    responses: responsesFromSchema(raw.response ?? raw.responses)
  };
}

export function literalToValue(expression: ts.Expression): unknown {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand)) {
    const value = Number(expression.operand.text);
    return expression.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) => literalToValue(element));
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const record: Record<string, unknown> = {};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }
      const key = propertyName(property.name);
      if (!key) {
        continue;
      }
      record[key] = literalToValue(property.initializer);
    }
    return record;
  }
  return undefined;
}

export function getProperty(objectLiteral: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (propertyName(property.name) === name) {
      return property.initializer;
    }
  }
  return undefined;
}

function parametersFromSchema(value: unknown, location: ApiParameter["in"]): ApiParameter[] {
  if (!isRecord(value) || !isRecord(value.properties)) {
    return [];
  }

  const required = new Set(stringArray(value.required) ?? []);
  return Object.entries(value.properties).flatMap(([name, schema]) => {
    if (!isRecord(schema)) {
      return [];
    }
    return [
      {
        name,
        in: location,
        required: location === "path" || required.has(name),
        description: stringValue(schema.description),
        schema
      }
    ];
  });
}

function requestBodyFromSchema(value: unknown): ApiRequestBody | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    required: true,
    content: {
      "application/json": {
        schema: value
      }
    }
  };
}

function responsesFromSchema(value: unknown): Record<string, ApiResponse> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, schema]) => isRecord(schema))
      .map(([status, schema]) => [
        status,
        {
          description: stringValue((schema as JsonSchema).description) ?? defaultResponseDescription(status),
          content: {
            "application/json": {
              schema: schema as JsonSchema
            }
          }
        }
      ])
  );
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function defaultResponseDescription(status: string): string {
  if (status === "204") {
    return "No Content";
  }
  return status.startsWith("2") ? "Successful response" : "Response";
}
