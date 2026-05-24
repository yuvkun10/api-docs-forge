export const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type JsonSchema = Record<string, unknown>;

export interface ApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface ApiMediaType {
  schema: JsonSchema;
}

export interface ApiRequestBody {
  required: boolean;
  description?: string;
  content: Record<string, ApiMediaType>;
}

export interface ApiResponse {
  description: string;
  content?: Record<string, ApiMediaType>;
}

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  source?: {
    file: string;
    line: number;
  };
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenApiOperation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
}

export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>>;

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: OpenApiInfo;
  paths: Record<string, OpenApiPathItem>;
}

export type DocFormat = "openapi" | "markdown" | "html";

export interface ParseOptions {
  cwd?: string;
}

export interface OpenApiOptions {
  title: string;
  version: string;
  description?: string;
}

export interface GenerateDocsOptions extends OpenApiOptions {
  input: string | string[];
  outDir: string;
  formats?: DocFormat[];
  useOpenAI?: boolean;
  openAIModel?: string;
}

export interface GenerateDocsResult {
  routes: ApiRoute[];
  document: OpenApiDocument;
  writtenFiles: string[];
}

export interface DescriptionProvider {
  describeRoute(route: ApiRoute): Promise<string>;
}

export interface TextGenerationRequest {
  instructions: string;
  input: string;
  model: string;
}

export interface TextGenerationClient {
  generateText(request: TextGenerationRequest): Promise<string>;
}
