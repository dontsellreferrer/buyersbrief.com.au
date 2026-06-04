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

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

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

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined,
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
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

function getJsonInstruction(format?: ResponseFormat): string {
  if (!format || format.type === "text") return "";
  if (format.type === "json_object") {
    return "Return only a valid JSON object. Do not wrap it in markdown fences or explanatory prose.";
  }
  return `Return only valid JSON matching this JSON Schema. Do not wrap it in markdown fences or explanatory prose. Schema: ${JSON.stringify(format.json_schema.schema)}`;
}

function providerTimeoutMs(): number {
  const value = Number(process.env.LLM_TIMEOUT_MS || "60000");
  return Number.isFinite(value) && value > 0 ? value : 60000;
}

async function invokeOpenAI(params: InvokeParams, responseFormat?: ResponseFormat): Promise<InvokeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const payload: Record<string, unknown> = {
    model: params.model || process.env.OPENAI_MODEL || "gpt-4.1-nano",
    messages: params.messages.map(normalizeOpenAIMessage),
    max_tokens: params.max_tokens || params.maxTokens || 4096,
  };

  if (params.tools?.length) payload.tools = params.tools;
  const toolChoice = normalizeToolChoice(params.toolChoice || params.tool_choice, params.tools);
  if (toolChoice) payload.tool_choice = toolChoice;
  if (responseFormat?.type === "json_object") payload.response_format = { type: "json_object" };
  if (responseFormat?.type === "json_schema") payload.response_format = responseFormat;

  const baseUrl = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(providerTimeoutMs()),
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

async function invokeAnthropic(params: InvokeParams, responseFormat?: ResponseFormat): Promise<InvokeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const systemParts: string[] = [];
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const message of params.messages) {
    if (message.role === "system") {
      systemParts.push(contentToText(message.content));
      continue;
    }

    const role = message.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: contentToText(message.content) });
  }

  const jsonInstruction = getJsonInstruction(responseFormat);
  if (jsonInstruction) systemParts.push(jsonInstruction);

  const payload = {
    model: params.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
    max_tokens: params.max_tokens || params.maxTokens || 4096,
    system: systemParts.join("\n\n"),
    messages,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(providerTimeoutMs()),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const data = await response.json() as {
    id: string;
    model: string;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n") || "";
  const promptTokens = data.usage?.input_tokens || 0;
  const completionTokens = data.usage?.output_tokens || 0;

  return {
    id: data.id,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: data.stop_reason || null,
    }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const responseFormat = normalizeResponseFormat(params);

  if (process.env.ANTHROPIC_API_KEY) {
    return invokeAnthropic(params, responseFormat);
  }

  if (process.env.OPENAI_API_KEY) {
    return invokeOpenAI(params, responseFormat);
  }

  throw new Error("No direct LLM provider is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}
