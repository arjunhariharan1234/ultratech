import { NextRequest, NextResponse } from "next/server";
import type { GenieContext } from "@/lib/genie/context";
import { askLLM, isLLMConfigured, getLLMErrorMessage, type LLMError } from "@/lib/genie/llm";

interface GenieRequest {
  question: string;
  context: GenieContext | null;
}

interface GenieResponse {
  answerMarkdown: string;
  citations?: Array<{
    type: "row" | "aggregate" | "filter";
    reference: string;
    value?: string | number;
  }>;
  debug?: {
    processingTimeMs: number;
    model?: string;
    tokens?: number;
    source: "llm" | "fallback";
  };
}

// =============================================================================
// FALLBACK RESPONSE (when LLM not configured)
// =============================================================================

function generateFallbackResponse(question: string, ctx: GenieContext): string {
  const { scorecards, topBranches, topConsignees, datasetStats, filterSummary } = ctx;

  return `## Direct Answer
Based on ${datasetStats.filteredRows} filtered records, the total potential recovery is **₹${scorecards.totalPotentialRecovery.toLocaleString("en-IN")}** across ${scorecards.totalDivertedJourneys} diverted journeys.

## Supporting Data
- **Top Branch**: ${topBranches[0]?.name ?? "N/A"} (₹${(topBranches[0]?.recovery ?? 0).toLocaleString("en-IN")})
- **Top Consignee**: ${topConsignees[0]?.name ?? "N/A"} (${topConsignees[0]?.journeys ?? 0} diversions)
- **Avg Short Lead**: ${scorecards.avgShortLeadDistanceKm} km
- **Max Deviation**: ${scorecards.maxDivertedDistanceKm} km

## Interpretation
- AI responses are currently unavailable (API key not configured)
- Showing basic summary from dashboard data
- For detailed analysis, please configure the OpenAI API key

## Recommended Next Actions
1. Configure OPENAI_API_KEY environment variable for AI-powered insights
2. Review the dashboard tables for detailed breakdowns
3. Use filters to narrow down specific branches or consignees

*Current filters: ${filterSummary}*`;
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<GenieResponse | { error: string }>> {
  const startTime = Date.now();

  try {
    const body: GenieRequest = await request.json();

    // Validate request
    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    const question = body.question.trim();

    if (question.length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question too long (max 500 characters)" },
        { status: 400 }
      );
    }

    if (!body.context) {
      return NextResponse.json(
        { error: "Missing context data" },
        { status: 400 }
      );
    }

    // Check if LLM is configured
    if (!isLLMConfigured()) {
      console.warn("[Genie API] LLM not configured, using fallback response");

      const fallbackMarkdown = generateFallbackResponse(question, body.context);

      return NextResponse.json({
        answerMarkdown: fallbackMarkdown,
        debug: {
          processingTimeMs: Date.now() - startTime,
          source: "fallback" as const,
        },
      });
    }

    // Call the LLM
    try {
      const llmResponse = await askLLM(question, body.context);

      return NextResponse.json({
        answerMarkdown: llmResponse.content,
        debug: {
          processingTimeMs: Date.now() - startTime,
          model: llmResponse.model,
          tokens: llmResponse.usage?.totalTokens,
          source: "llm" as const,
        },
      });
    } catch (llmError) {
      // Handle LLM-specific errors
      const error = llmError as LLMError;
      const userMessage = getLLMErrorMessage(error);

      console.error("[Genie API] LLM error:", error.type, error.message);

      // Return error response with user-friendly message
      return NextResponse.json(
        { error: userMessage },
        { status: error.type === "auth" ? 503 : 500 }
      );
    }
  } catch (error) {
    console.error("[Genie API] Request error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
