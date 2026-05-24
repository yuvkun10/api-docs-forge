import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import fg from "fast-glob";
import ts from "typescript";

import { parseAnnotations } from "./annotations.js";
import { extractRouteSchema } from "./schema.js";
import type { ApiRoute, ParseOptions } from "./types.js";
import { isHttpMethod, makeOperationId, mergeParameters, normalizeMethod, normalizePath, pathParameters } from "./utils.js";

export async function parseProjectRoutes(input: string | string[], options: ParseOptions = {}): Promise<ApiRoute[]> {
  const cwd = options.cwd ?? process.cwd();
  const files = await resolveInputFiles(input, cwd);
  const routes: ApiRoute[] = [];

  for (const file of files) {
    const sourceText = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const route = routeFromCallExpression(node, sourceFile);
        if (route) {
          routes.push(route);
        }
      } else if (isAnnotatedDeclaration(node)) {
        const route = routeFromAnnotatedDeclaration(node, sourceFile);
        if (route) {
          routes.push(route);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return routes.sort((left, right) => `${left.path}:${left.method}`.localeCompare(`${right.path}:${right.method}`));
}

async function resolveInputFiles(input: string | string[], cwd: string): Promise<string[]> {
  const patterns = Array.isArray(input) ? input : [input];
  const directFiles: string[] = [];
  const globs: string[] = [];

  for (const pattern of patterns) {
    const candidate = isAbsolute(pattern) ? pattern : resolve(cwd, pattern);
    if (await isFile(candidate)) {
      directFiles.push(candidate);
    } else {
      globs.push(pattern);
    }
  }

  const globFiles = globs.length
    ? await fg(globs, {
        cwd,
        absolute: true,
        onlyFiles: true,
        unique: true,
        ignore: ["**/node_modules/**", "**/dist/**", "**/coverage/**"]
      })
    : [];
  return [...new Set([...directFiles, ...globFiles])].sort((left, right) => left.localeCompare(right));
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function routeFromCallExpression(call: ts.CallExpression, sourceFile: ts.SourceFile): ApiRoute | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined;
  }

  const methodName = call.expression.name.text.toLowerCase();
  if (!isHttpMethod(methodName)) {
    return undefined;
  }

  const pathExpression = call.arguments[0];
  const rawPath = pathExpression ? stringLiteralValue(pathExpression) : undefined;
  if (!rawPath) {
    return undefined;
  }

  const statement = enclosingStatement(call);
  const annotations = parseAnnotations(leadingComment(sourceFile, statement ?? call));
  const options = call.arguments.find((argument): argument is ts.ObjectLiteralExpression => ts.isObjectLiteralExpression(argument));
  const schema = extractRouteSchema(options);
  const method = annotations.method ?? normalizeMethod(methodName);
  const path = annotations.path ?? normalizePath(rawPath);
  const operationId = annotations.operationId ?? schema.operationId ?? handlerName(call) ?? makeOperationId(method, path);

  return {
    method,
    path,
    operationId,
    summary: annotations.summary ?? schema.summary,
    description: annotations.description ?? schema.description,
    tags: unique([...annotations.tags, ...(schema.tags ?? [])]),
    parameters: mergeParameters(pathParameters(path), schema.parameters, annotations.parameters),
    requestBody: annotations.requestBody ?? schema.requestBody,
    responses: {
      ...schema.responses,
      ...annotations.responses
    },
    source: sourceLocation(sourceFile, call)
  };
}

function routeFromAnnotatedDeclaration(node: ts.Node, sourceFile: ts.SourceFile): ApiRoute | undefined {
  const annotations = parseAnnotations(leadingComment(sourceFile, node));
  if (!annotations.method || !annotations.path) {
    return undefined;
  }

  return {
    method: annotations.method,
    path: annotations.path,
    operationId: annotations.operationId ?? declarationName(node) ?? makeOperationId(annotations.method, annotations.path),
    summary: annotations.summary,
    description: annotations.description,
    tags: unique(annotations.tags),
    parameters: mergeParameters(pathParameters(annotations.path), annotations.parameters),
    requestBody: annotations.requestBody,
    responses: annotations.responses,
    source: sourceLocation(sourceFile, node)
  };
}

function isAnnotatedDeclaration(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) || ts.isVariableStatement(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node);
}

function leadingComment(sourceFile: ts.SourceFile, node: ts.Node): string | undefined {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.getFullStart()) ?? [];
  const routeComments = ranges
    .map((range) => fullText.slice(range.pos, range.end))
    .filter((comment) => comment.includes("@api") || comment.includes("@route") || comment.includes("@summary"));
  return routeComments.at(-1);
}

function enclosingStatement(node: ts.Node): ts.Node | undefined {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current)) {
    current = current.parent;
  }
  return current;
}

function stringLiteralValue(expression: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  return undefined;
}

function handlerName(call: ts.CallExpression): string | undefined {
  const last = call.arguments.at(-1);
  if (!last) {
    return undefined;
  }
  if (ts.isIdentifier(last)) {
    return last.text;
  }
  if (ts.isFunctionExpression(last) && last.name) {
    return last.name.text;
  }
  return undefined;
}

function declarationName(node: ts.Node): string | undefined {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
    return node.name.text;
  }
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isIdentifier(declaration.name)) {
      return declaration.name.text;
    }
  }
  return undefined;
}

function sourceLocation(sourceFile: ts.SourceFile, node: ts.Node) {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    file: resolve(sourceFile.fileName),
    line: location.line + 1
  };
}

function unique(values: string[]): string[] | undefined {
  const entries = [...new Set(values.filter(Boolean))];
  return entries.length > 0 ? entries : undefined;
}
