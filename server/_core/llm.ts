export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type FunctionTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type WebSearchTool = {
  type: "web_search_preview";
  search_context_size?: "low" | "medium" | "high";
  user_location?: Record<string, unknown>;
};

export type Tool = FunctionTool | WebSearchTool;

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

const contentToText = (content: MessageContent | MessageContent[]): string =>
  ensureArray(content)
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "image_url") return `[image: ${part.image_url.url}]`;
      if (part.type === "file_url") return `[file: ${part.file_url.url}]`;
      return JSON.stringify(part);
    })
    .join("\n");

const normalizeOpenAIMessage = (message: Message) => ({
  role: message.role === "function" ? "tool" : message.role,
  content: contentToText(message.content),
  ...(message.name ? { name: message.name } : {}),
  ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
});

const functionTools = (tools: Tool[] | undefined): FunctionTool[] | undefined => {
  const onlyFunctions = tools?.filter((tool): tool is FunctionTool => tool.type === "function");
  return onlyFunctions && onlyFunctions.length > 0 ? onlyFunctions : undefined;
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: FunctionTool[] | undefined,
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no function tools were configured");
    }
    if (tools.length > 1) {
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    }
    return { type: "function", function: { name: tools[0].function.name } };
  }

  if ("name" in toolChoice) {
    return { type: "function", function: { name: toolChoice.name } };
  }

  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): ResponseFormat | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) return explicitFormat;

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

function providerTimeoutMs(params?: InvokeParams): number {
  if (params?.timeoutMs && Number.isFinite(params.timeoutMs) && params.timeoutMs > 0) return params.timeoutMs;
  const value = Number(process.env.LLM_TIMEOUT_MS || "60000");
  return Number.isFinite(value) && value > 0 ? value : 60000;
}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return {
    apiKey,
    baseUrl: (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, ""),
  };
}

async function invokeOpenAIChat(params: InvokeParams, responseFormat?: ResponseFormat): Promise<InvokeResult> {
  const { apiKey, baseUrl } = getOpenAIConfig();
  const tools = functionTools(params.tools);
  const payload: Record<string, unknown> = {
    model: params.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: params.messages.map(normalizeOpenAIMessage),
    max_tokens: params.max_tokens || params.maxTokens || 4096,
  };

  if (typeof params.temperature === "number") payload.temperature = params.temperature;
  if (tools?.length) payload.tools = tools;
  const toolChoice = normalizeToolChoice(params.toolChoice || params.tool_choice, tools);
  if (toolChoice) payload.tool_choice = toolChoice;
  if (responseFormat?.type === "json_object") payload.response_format = { type: "json_object" };
  if (responseFormat?.type === "json_schema") payload.response_format = responseFormat;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(providerTimeoutMs(params)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const data = await response.json() as InvokeResult & { error?: { message?: string } | string };
  if (data.error) {
    const message = typeof data.error === "string" ? data.error : data.error.message || JSON.stringify(data.error);
    throw new Error(`OpenAI invoke failed: ${message}`);
  }
  if (!Array.isArray(data.choices)) {
    throw new Error(`OpenAI invoke failed: response did not include choices (${JSON.stringify(Object.keys(data))})`);
  }
  return data;
}

type OpenAIResponsesResult = {
  id?: string;
  created_at?: number;
  model?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string } | string;
};

function responsesText(data: OpenAIResponsesResult): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" || part.type === "text")
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");
}

async function invokeOpenAIResponses(params: InvokeParams, responseFormat?: ResponseFormat): Promise<InvokeResult> {
  const { apiKey, baseUrl } = getOpenAIConfig();
  const payload: Record<string, unknown> = {
    model: params.model || process.env.OPENAI_MODEL || "gpt-4o",
    input: params.messages.map((message) => ({
      role: message.role === "function" || message.role === "tool" ? "user" : message.role,
      content: contentToText(message.content),
    })),
    tools: params.tools || [],
    max_output_tokens: params.max_tokens || params.maxTokens || 4096,
  };

  if (typeof params.temperature === "number") payload.temperature = params.temperature;
  if (responseFormat?.type === "json_schema") {
    payload.text = {
      format: {
        type: "json_schema",
        name: responseFormat.json_schema.name,
        schema: responseFormat.json_schema.schema,
        strict: responseFormat.json_schema.strict ?? false,
      },
    };
  } else if (responseFormat?.type === "json_object") {
    payload.text = { format: { type: "json_object" } };
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(providerTimeoutMs(params)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Responses invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const data = await response.json() as OpenAIResponsesResult;
  if (data.error) {
    const message = typeof data.error === "string" ? data.error : data.error.message || JSON.stringify(data.error);
    throw new Error(`OpenAI Responses invoke failed: ${message}`);
  }

  const text = responsesText(data);
  return {
    id: data.id || `resp_${Date.now()}`,
    created: data.created_at || Math.floor(Date.now() / 1000),
    model: data.model || params.model || process.env.OPENAI_MODEL || "gpt-4o",
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: null,
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: data.usage?.total_tokens || ((data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)),
    },
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const responseFormat = normalizeResponseFormat(params);
  const needsResponsesApi = params.tools?.some((tool) => tool.type !== "function") || false;

  if (needsResponsesApi) {
    return invokeOpenAIResponses(params, responseFormat);
  }

  return invokeOpenAIChat(params, responseFormat);
}
