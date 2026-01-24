/**
 * LLM Client for Genie
 *
 * Uses OpenAI GPT with:
 * - Low temperature (0.2) for consistent outputs
 * - Strict markdown section format
 * - Retry logic with exponential backoff
 * - Timeout handling
 */

import type { GenieContext } from "./context";

// =============================================================================
// CONFIGURATION
// =============================================================================

const LLM_CONFIG = {
  model: "gpt-4o-mini", // Fast and cost-effective
  temperature: 0.2,
  maxTokens: 1024,
  timeoutMs: 30000, // 30 seconds
  maxRetries: 2,
  retryDelayMs: 1000,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
}

export interface LLMError {
  type: "timeout" | "rate_limit" | "auth" | "api" | "unknown";
  message: string;
  retryable: boolean;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Genie, an AI assistant for the Ultratech Diversion Dashboard. You help operations teams understand freight diversion patterns and identify recovery opportunities.

## Your Role
- Analyze diversion data to answer questions about branches, consignees, corridors, and recovery amounts
- Provide actionable insights with specific numbers from the data
- Recommend audit-first actions (investigate before penalize)
- Be precise with data—never invent numbers

## Response Format
You MUST respond using EXACTLY these four markdown sections:

## Direct Answer
[1-2 sentences with the key finding, including specific numbers]

## Supporting Data
[Bullet points OR a markdown table with relevant metrics]

## Interpretation
[2-3 bullets explaining what the data indicates AND what it does NOT prove]

## Recommended Next Actions
[3 numbered action items, starting with audit/investigation steps]

## Guardrails
- ONLY use data provided in the context—never hallucinate numbers
- If data is insufficient, say so clearly
- Amounts are in INR (₹), distances in km
- Be concise—operations teams need quick answers
- Never recommend punitive action without audit first
- If asked about something outside the data, redirect to what you CAN answer`;

// =============================================================================
// USER PROMPT BUILDER
// =============================================================================

function buildUserPrompt(question: string, context: GenieContext): string {
  return `## User Question
${question}

## Dashboard Context (JSON)
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Answer the question using ONLY the data provided above. Follow the exact response format with four sections.`;
}

// =============================================================================
// OPENAI API CLIENT
// =============================================================================

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw { type: "auth", message: "OPENAI_API_KEY not configured", retryable: false } as LLMError;
  }

  const startTime = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      temperature: LLM_CONFIG.temperature,
      max_tokens: LLM_CONFIG.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal,
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;

    if (response.status === 401) {
      throw { type: "auth", message: "Invalid API key", retryable: false } as LLMError;
    }
    if (response.status === 429) {
      throw { type: "rate_limit", message: "Rate limit exceeded", retryable: true } as LLMError;
    }
    if (response.status >= 500) {
      throw { type: "api", message: `OpenAI server error: ${errorMessage}`, retryable: true } as LLMError;
    }
    throw { type: "api", message: errorMessage, retryable: false } as LLMError;
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw { type: "api", message: "Empty response from OpenAI", retryable: true } as LLMError;
  }

  return {
    content: choice.message.content,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    model: data.model || LLM_CONFIG.model,
    latencyMs,
  };
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  maxRetries: number,
  retryDelayMs: number,
  timeoutMs: number
): Promise<T> {
  let lastError: LLMError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (err instanceof Error && err.name === "AbortError") {
        lastError = { type: "timeout", message: "Request timed out", retryable: true };
      } else if (isLLMError(err)) {
        lastError = err;
      } else {
        lastError = {
          type: "unknown",
          message: err instanceof Error ? err.message : "Unknown error",
          retryable: false,
        };
      }

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = retryDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || { type: "unknown", message: "Unexpected error", retryable: false };
}

function isLLMError(err: unknown): err is LLMError {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    "message" in err &&
    "retryable" in err
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Ask the LLM a question with the given context.
 * Returns the markdown response or throws an LLMError.
 */
export async function askLLM(question: string, context: GenieContext): Promise<LLMResponse> {
  const userPrompt = buildUserPrompt(question, context);

  // Log request (never log API key)
  if (process.env.NODE_ENV === "development") {
    console.log(`[Genie LLM] Question: "${question.substring(0, 50)}..."`);
    console.log(`[Genie LLM] Context size: ${JSON.stringify(context).length} bytes`);
  }

  const response = await withRetry(
    (signal) => callOpenAI(SYSTEM_PROMPT, userPrompt, signal),
    LLM_CONFIG.maxRetries,
    LLM_CONFIG.retryDelayMs,
    LLM_CONFIG.timeoutMs
  );

  // Log response (dev only)
  if (process.env.NODE_ENV === "development") {
    console.log(`[Genie LLM] Response: ${response.latencyMs}ms, ${response.usage?.totalTokens ?? "?"} tokens`);
  }

  return response;
}

/**
 * Check if the LLM is properly configured.
 */
export function isLLMConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get a user-friendly error message from an LLMError.
 */
export function getLLMErrorMessage(error: LLMError): string {
  switch (error.type) {
    case "timeout":
      return "The AI took too long to respond. Please try again.";
    case "rate_limit":
      return "Too many requests. Please wait a moment and try again.";
    case "auth":
      return "AI service not configured. Please contact support.";
    case "api":
      return "AI service error. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
